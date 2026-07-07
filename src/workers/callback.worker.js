const { callbackQueue, philpayPayoutQueue, bluswapPayoutQueue } = require('../config/queue.config');
const { finalizePayout } = require('../services/payoutReconciliation.service');
const { logger } = require('../utils/logger');
const PayinTransaction = require('../models/payinTransaction.model');
const UserTransaction = require('../models/userTransaction.model');
const PayoutTransaction = require('../models/payoutTransaction.model');
const { TransactionCharges, FinancialDetails, MerchantDetails } = require('../models');
const mongoose = require('mongoose');
const config = require('../config/index');
const axios = require('axios');

// Configure queue with retry and timeout settings
callbackQueue.setMaxListeners(0); // Prevent memory leaks
callbackQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});

// Connect to MongoDB
mongoose.connect(config.mongodb.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    logger.info('MongoDB connected successfully in callback worker');
  })
  .catch((err) => {
    logger.error('MongoDB connection error in callback worker:', err);
    process.exit(1);
  });

// Process callback jobs
callbackQueue.process(async function (job) {
  const startTime = Date.now();
  let timeout = null;
  try {
    logger.info('Processing callback job', { jobId: job.id, attempts: job.attemptsMade });

    timeout = setTimeout(() => {
      logger.error('Job processing timeout', { jobId: job.id });
      throw new Error('Job processing timeout');
    }, 300000);

    const { statuscode, amount, apitxnid, txnid, utr, message } = job.data;

    const mappedStatus = (statuscode === 'TXN' || statuscode === 'SUCCESS') ? 'completed' : 'failed';

    const payinTransaction = await PayinTransaction.findOne({ reference_id: apitxnid });

    if (!payinTransaction) {
      logger.error('PayinTransaction not found', { jobId: job.id, apitxnid });
      throw new Error('Transaction record not found');
    }

    const userId = payinTransaction.user.user_id;
    const alreadyCompleted = payinTransaction.status === 'completed';

    // Only credit wallet if not already done
    if (!alreadyCompleted) {
      const updateData = {
        status: mappedStatus,
        gateway_response: {
          utr,
          status: mappedStatus,
          message: message || 'Transaction processed',
          raw_response: job.data
        }
      };

      if (mappedStatus === 'completed') {
        const transactionAmount = parseFloat(amount || 0);
        const adminCharge = parseFloat(payinTransaction.charges?.admin_charge || 0);
        const platformFee = parseFloat(payinTransaction.platform_fee || 0);
        const gstAmount = parseFloat(payinTransaction.gst_amount || 0);
        const amountToAdd = transactionAmount - adminCharge - platformFee - gstAmount;

        const financialDetails = await FinancialDetails.findOne({ where: { user_id: userId } });
        if (financialDetails) {
          await financialDetails.increment('wallet', { by: amountToAdd });
        } else {
          await FinancialDetails.create({ user_id: userId, wallet: amountToAdd, settlement: 0, lien: 0, rolling_reserve: 0 });
        }
        logger.info('Wallet updated', { user_id: userId, amountToAdd, reference_id: apitxnid });
      }

      await Promise.all([
        PayinTransaction.updateOne({ reference_id: apitxnid }, { $set: updateData }),
        TransactionCharges.update(
          { status: mappedStatus, transaction_utr: utr },
          { where: { reference_id: apitxnid } }
        )
      ]);
      logger.info('Transaction records updated', { jobId: job.id, apitxnid, status: mappedStatus });
    } else {
      logger.warn('Wallet already credited — skipping, will still attempt webhook', { jobId: job.id, apitxnid });
    }

    // Always attempt webhook — even if wallet was already credited
    // Skip only if webhook was already successfully delivered
    const webhookAlreadySent = !!payinTransaction.metadata?.callback_received_at;
    if (webhookAlreadySent) {
      logger.info('Webhook already delivered, skipping', { jobId: job.id, apitxnid });
      clearTimeout(timeout);
      return { success: true, reference_id: apitxnid, status: mappedStatus, skipped: true };
    }

    const merchantDetails = await MerchantDetails.findOne({ where: { user_id: parseInt(userId, 10) } });

    if (merchantDetails?.payin_callback) {
      const maxRetries = 3;
      const baseDelay = 1000;

      const callbackData = {
        reference_id: apitxnid,
        transaction_id: txnid,
        amount,
        status: mappedStatus,
        utr,
        message: message || 'Transaction processed',
        timestamp: new Date().toISOString()
      };

      let webhookSent = false;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await axios.post(merchantDetails.payin_callback, callbackData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });
          logger.info('Merchant callback sent', { reference_id: apitxnid, status: response.status, attempt });

          await PayinTransaction.updateOne(
            { reference_id: apitxnid },
            { $set: { 'metadata.callback_received_at': new Date() } }
          );
          webhookSent = true;
          break;
        } catch (error) {
          logger.warn('Callback attempt failed', {
            reference_id: apitxnid,
            error: error.message,
            response_status: error.response?.status,
            response_body: error.response?.data,
            attempt
          });
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
          }
        }
      }

      if (!webhookSent) {
        // Throw so Bull retries the whole job — webhook delivery is mandatory
        throw new Error(`Merchant webhook delivery failed for ${apitxnid} after ${maxRetries} attempts`);
      }
    } else {
      logger.warn('No payin callback URL for merchant', { reference_id: apitxnid, user_id: userId });
    }

    // Clear timeout on successful completion
    if (timeout) {
      clearTimeout(timeout);
    }

    const processingTime = Date.now() - startTime;
    logger.info('Callback processed successfully', {
      reference_id: apitxnid,
      status: mappedStatus,
      utr,
      processingTimeMs: processingTime
    });

    return {
      success: true,
      reference_id: apitxnid,
      status: mappedStatus
    };

  } catch (error) {
    // Clear timeout in case of error
    if (timeout) {
      clearTimeout(timeout);
    }

    logger.error('Error processing callback', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade
    });

    if (job.attemptsMade >= 3) {
      logger.error('Job failed permanently after max retries', {
        jobId: job.id,
        attempts: job.attemptsMade
      });
      return { success: false, error: 'Max retries exceeded' };
    }

    throw error;
  }
});

// Handle job events
callbackQueue.on('completed', (job, result) => {
  logger.info('Callback job completed successfully', {
    jobId: job.id,
    result
  });
});

callbackQueue.on('failed', (job, error) => {
  logger.error('Callback job failed', {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });
});

callbackQueue.on('stalled', (job) => {
  logger.warn('Callback job stalled', {
    jobId: job.id,
    attempts: job.attemptsMade
  });
});

philpayPayoutQueue.process(async function (job) {
  try {
    logger.info('Processing philpay payout job', {
      jobId: job.id,
      data: job.data,
      attempts: job.attemptsMade
    });
    console.log("this is philpay payout job data", job.data)
    if (job.data.data.object.status == "success" || job.data.data.object.status == "Success") {
      // Update transaction charges
      await TransactionCharges.update(
        {
          status: 'completed',
          transaction_utr: job.data.data.object.bank_reference_id || null
        },
        {
          where: {
            reference_id: job.data.data.object.merchant_order_id
          }
        }
      );
      logger.info('Transaction charges stored', { reference: job.data.data.object.merchant_order_id });
      // Update user transaction
      await UserTransaction.updateOne(
        { reference_id: job.data.data.object.merchant_order_id },
        {
          $set: {
            status: 'success',
            gateway_response: {
              merchant_response: job.data.data.object.merchant_order_id,
              status: 'success',
              message: job.data.data.object.message || 'Transaction processed',
              utr: job.data.data.object.bank_reference_id || null
            }
          }
        }
      );
      logger.info('User transaction updated', { reference: job.data.data.object.merchant_order_id });
      // Update payout transaction
      await PayoutTransaction.updateOne(
        { reference_id: job.data.data.object.merchant_order_id },
        {
          $set: {
            status: 'success',
            gateway_response: {
              merchant_response: job.data.data.object.merchant_order_id,
              status: 'success',
              message: job.data.data.object.message || 'Transaction processed',
              utr: job.data.data.object.bank_reference_id || null
            }
          }
        }
      );
      logger.info('Payout transaction updated', { reference: job.data.data.object.merchant_order_id });
    }
    else {
      logger.info('Philpay payout job failed', {
        jobId: job.id,
        status: job.data.data.object.status,
        message: job.data.data.object.acquirer_message || 'Transaction failed',
        attempts: job.attemptsMade
      });
      await TransactionCharges.update(
        {
          status: 'failed',
          transaction_utr: job.data.data.object.bank_reference_id || null
        },
        {
          where: {
            reference_id: job.data.data.object.merchant_order_id
          }
        }
      );
      logger.info('Transaction charges stored', { reference: job.data.data.object.merchant_order_id });
      // Update user transaction
      await UserTransaction.updateOne(
        { reference_id: job.data.data.object.merchant_order_id },
        {
          $set: {
            status: 'failed',
            gateway_response: {
              merchant_response: job.data.data.object.merchant_order_id,
              status: 'failed',
              message: job.data.data.object.message || 'Transaction failed',
              utr: job.data.data.object.bank_reference_id || null
            }
          }
        }
      );
      logger.info('User transaction updated', { reference: job.data.data.object.merchant_order_id });
      // Update payout transaction
      await PayoutTransaction.updateOne(
        { reference_id: job.data.data.object.merchant_order_id },
        {
          $set: {
            status: 'failed',
            gateway_response: {
              merchant_response: job.data.data.object.merchant_order_id,
              status: 'failed',
              message: job.data.data.object.message || 'Transaction failed',
              utr: job.data.data.object.bank_reference_id || null
            }
          }
        }
      );
      logger.info('Payout transaction updated', { reference: job.data.data.object.merchant_order_id });
    }

    const payinTransaction = await PayoutTransaction.findOne({ reference_id: job.data.data.object.merchant_order_id });
    const userTransaction = await UserTransaction.findOne({ reference_id: job.data.data.object.merchant_order_id });

    if (!payinTransaction || !userTransaction) {
      throw new Error('Transaction records not found');
    }

    const userId = payinTransaction.user.user_id;
    const settlement_amount = payinTransaction.amount;
    const chargesAmount = payinTransaction.charges.total_charges;

    // Only update settlement wallet if payout failed (refund the money)
    if (job.data.data.object.status !== "success" && job.data.data.object.status !== "Success") {
      const userCurrrentBalance = await FinancialDetails.findOne({
        where: {
          user_id: parseInt(userId, 10)
        }
      });

      if (userCurrrentBalance) {
        // Ensure all values are properly parsed as numbers and handle potential null/undefined values
        const currentSettlement = parseFloat(userCurrrentBalance.settlement || 0);
        const settlementAmount = parseFloat(settlement_amount || 0);
        const chargesAmountParsed = parseFloat(chargesAmount || 0);

        const newSettlement = currentSettlement + settlementAmount + chargesAmountParsed;

        // Ensure the result is a valid number and round to 2 decimal places
        userCurrrentBalance.settlement = parseFloat(newSettlement.toFixed(2));
        await userCurrrentBalance.save();

        logger.info('Settlement wallet refunded for failed payout', {
          reference_id: job.data.data.object.merchant_order_id,
          user_id: userId,
          amount_refunded: settlementAmount + chargesAmountParsed,
          new_settlement_balance: userCurrrentBalance.settlement
        });
      }
    } else {
      logger.info('Payout successful - no settlement refund needed', {
        reference_id: job.data.data.object.merchant_order_id,
        user_id: userId
      });
    }
    const merchantDetails = await MerchantDetails.findOne({
      where: {
        user_id: parseInt(userId, 10)
      }
    });

    if (merchantDetails?.payout_callback) {
      // Retry configuration
      const maxRetries = 3;
      const baseDelay = 2000; // 2 seconds
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          let callbackData;
          if (job.data.data.object.status == "success" || job.data.data.object.status == "Success") {
            callbackData = {
              reference_id: job.data.data.object.merchant_order_id,
              amount: job.data.data.object.amount / 100,
              status: job.data.data.object.status,
              utr: job.data.data.object.bank_reference_id,
              message: job.data.data.object.message || 'Transaction processed',
              timestamp: new Date().toISOString()
            };
          } else {
            callbackData = {
              reference_id: job.data.data.object.merchant_order_id,
              amount: job.data.data.object.amount / 100,
              status: job.data.data.object.status,
              utr: job.data.data.object.bank_reference_id,
              message: job.data.data.object.message || 'Transaction failed',
              timestamp: new Date().toISOString()
            };
          }

          console.log("this is callback data of philpay payout", callbackData)

          const response = await axios.post(merchantDetails.payout_callback, callbackData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });

          logger.info('Callback sent successfully to merchant', {
            reference_id: job.data.data.object.merchant_order_id,
            callback_url: merchantDetails.payout_callback,
            response_status: response.status,
            attempt: attempt
          });

          // Success - break out of retry loop
          break;

        } catch (error) {
          lastError = error;

          logger.warn('Callback attempt failed', {
            reference_id: job.data.data.object.merchant_order_id,
            callback_url: merchantDetails.payout_callback,
            error: error.message,
            response_status: error.response?.status,
            response_body: error.response?.data,
            attempt: attempt,
            maxRetries: maxRetries
          });

          // If this is the last attempt, log the final error
          if (attempt === maxRetries) {
            logger.error('Failed to send callback to merchant after all retries', {
              reference_id: job.data.data.object.merchant_order_id,
              callback_url: merchantDetails.payout_callback,
              error: error.message,
              totalAttempts: maxRetries
            });
          } else {
            // Wait before retrying with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.info(`Retrying callback in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, {
              reference_id: job.data.data.object.merchant_order_id
            });
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    }
    else {
      logger.warn('No callback URL found for merchant', {
        reference_id: job.data.data.object.merchant_order_id,
        user_id: userId
      });
    }

    return { success: true, jobId: job.id };
  } catch (error) {
    logger.error('Error processing philpay payout job', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade
    });
    return { success: false, error: `Error is ${error}`, jobId: job.id };
  }
});

philpayPayoutQueue.on('completed', (job, result) => {
  logger.info('Philpay payout job completed successfully', {
    jobId: job.id,
    result
  });
});

philpayPayoutQueue.on('failed', (job, error) => {
  logger.error('Philpay payout job failed', {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });
});

philpayPayoutQueue.on('stalled', (job) => {
  logger.warn('Philpay payout job stalled', {
    jobId: job.id,
    attempts: job.attemptsMade
  });
});


bluswapPayoutQueue.process(async function (job) {
  try {
    logger.info('Processing bluswap payout job', {
      jobId: job.id,
      data: job.data,
      attempts: job.attemptsMade
    });
    console.log("this is bluswap payout job data", job.data)

    const trxStatus = (job.data.data?.trx_status || '').toUpperCase();
    const referenceId = job.data.data?.order_id;
    const utr = job.data.data?.utr || null;
    const bluswapTransactionId = job.data.data?.transaction_id || null;
    const isSuccess = trxStatus === 'SUCCESS';

    // Shared, idempotent finalization — same path used by the reconcile routes.
    // Guards against double refund / duplicate callback if a late webhook and a
    // manual reconcile race each other.
    const result = await finalizePayout({
      referenceId,
      isSuccess,
      utr,
      gatewayTransactionId: bluswapTransactionId,
      message: job.data.data?.trx_message || job.data.message || null
    });

    logger.info('BluSwap payout finalized via callback', { jobId: job.id, referenceId, result });
    return { success: true, jobId: job.id, ...result };
  } catch (error) {
    logger.error('Error processing bluswap payout job', {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      attempts: job.attemptsMade
    });
    return { success: false, error: `Error is ${error}`, jobId: job.id };
  }
});

bluswapPayoutQueue.on('completed', (job, result) => {
  logger.info('BluSwap payout job completed successfully', {
    jobId: job.id,
    result
  });
});

bluswapPayoutQueue.on('failed', (job, error) => {
  logger.error('BluSwap payout job failed', {
    jobId: job.id,
    error: error.message,
    stack: error.stack,
    attempts: job.attemptsMade
  });
});

bluswapPayoutQueue.on('stalled', (job) => {
  logger.warn('BluSwap payout job stalled', {
    jobId: job.id,
    attempts: job.attemptsMade
  });
});


// Handle process events
process.on('SIGTERM', async () => {
  logger.info('Shutting down callback worker...');
  await mongoose.connection.close();
  await callbackQueue.close();
  await philpayPayoutQueue.close();
  await bluswapPayoutQueue.close();
  process.exit(0);
});

// Log worker start
logger.info('Callback worker started and processing jobs'); 