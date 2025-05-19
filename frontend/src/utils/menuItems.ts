import { MenuItem } from '../types';
import {
  Users,
  Wallet,
  FileText,
  Settings,
  BookOpen,
  CreditCard,
  DollarSign,
  ArrowUpDown,
  UserPlus,
  FileSpreadsheet,
  AlertTriangle,
  BarChart3,
  Receipt,
  ArrowLeftRight,
  HelpCircle,
  User,
  Key,
  LayoutDashboard,
  UserCog,
  ArrowDownToLine,
  FileWarning
} from 'lucide-react';

export const getMenuItems = (userType: string): MenuItem[] => {
  // Map payin_payout to user menu items
  if (userType === 'payin_payout') {
    return [
      {
        title: 'Dashboard',
        path: '/user',
        icon: 'LayoutDashboard'
      },
      {
        title: 'Fund Request',
        path: '/user/fund-request',
        icon: 'DollarSign'
      },
      {
        title: 'Wallet Report',
        path: '/user/wallet-report',
        icon: 'Wallet'
      },
      {
        title: 'Payout Report',
        path: '/user/payout-report',
        icon: 'FileText'
      },
      {
        title: 'Payin Report',
        path: '/user/payin-report',
        icon: 'ArrowDownToLine'
      },
      {
        title: 'Developer Settings',
        path: '/user/developer-settings',
        icon: 'Settings'
      },
      {
        title: 'Development Docs',
        path: '/user/development-docs',
        icon: 'BookOpen'
      }
    ];
  }

  switch (userType) {
    case 'admin':
      return [
        {
          title: 'Dashboard',
          path: '/admin',
          icon: 'LayoutDashboard'
        },
        {
          title: 'Manage Users',
          path: '/admin/manage-user',
          icon: 'Users'
        },
        {
          title: 'Manage Staff',
          path: '/admin/manage-staff',
          icon: 'UserCog'
        },
        {
          title: 'Manage Payout',
          path: '/admin/manage-payout',
          icon: 'ArrowUpDown'
        },
        {
          title: 'Bulk Payout',
          path: '/admin/bulk-payout',
          icon: 'FileSpreadsheet'
        },
        {
          title: 'Wallet Report',
          path: '/admin/wallet-report',
          icon: 'Wallet'
        },
        {
          title: 'Payout Report',
          path: '/admin/payout-report',
          icon: 'FileText'
        },
        {
          title: 'Payin Report',
          path: '/admin/payin-report',
          icon: 'ArrowDownToLine'
        },
        {
          title: 'Chargeback',
          path: '/admin/chargeback',
          icon: 'AlertTriangle'
        },
        {
          title: 'Chargeback Report',
          path: '/admin/chargeback-report',
          icon: 'FileWarning'
        },
        {
          title: 'Fund Requests',
          path: '/admin/manage-fund-request',
          icon: 'DollarSign'
        },
        {
          title: 'Settlement',
          path: '/admin/settlement',
          icon: 'Receipt'
        }
      ];

    case 'agent':
      return [
        {
          title: 'Dashboard',
          path: '/agent',
          icon: 'LayoutDashboard'
        },
        {
          title: 'Add Users',
          path: '/agent/add-users',
          icon: 'UserPlus'
        },
        {
          title: 'Fund Request',
          path: '/agent/fund-request',
          icon: 'DollarSign'
        },
        {
          title: 'Wallet Report',
          path: '/agent/wallet-report',
          icon: 'Wallet'
        },
        {
          title: 'Payout Report',
          path: '/agent/payout-report',
          icon: 'FileText'
        },
        {
          title: 'Payin Report',
          path: '/agent/payin-report',
          icon: 'ArrowDownToLine'
        },
        {
          title: 'Developer Settings',
          path: '/agent/developer-settings',
          icon: 'Settings'
        },
        {
          title: 'Development Docs',
          path: '/agent/development-docs',
          icon: 'BookOpen'
        }
      ];

    case 'user':
      return [
        {
          title: 'Dashboard',
          path: '/user',
          icon: 'LayoutDashboard'
        },
        {
          title: 'Fund Request',
          path: '/user/fund-request',
          icon: 'DollarSign'
        },
        {
          title: 'Wallet Report',
          path: '/user/wallet-report',
          icon: 'Wallet'
        },
        {
          title: 'Payout Report',
          path: '/user/payout-report',
          icon: 'FileText'
        },
        {
          title: 'Payin Report',
          path: '/user/payin-report',
          icon: 'ArrowDownToLine'
        },
        {
          title: 'Developer Settings',
          path: '/user/developer-settings',
          icon: 'Settings'
        },
        {
          title: 'Development Docs',
          path: '/user/development-docs',
          icon: 'BookOpen'
        }
      ];

    default:
      return [];
  }
}; 