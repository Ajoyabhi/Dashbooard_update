import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Filter, Download, MoreHorizontal } from 'lucide-react';
import { getStatusColor } from '../../utils/formatUtils';

interface Column {
  header: string;
  accessor: string;
  cell?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

export interface TableProps {
  columns: Column[];
  data: any[];
  title?: string;
  description?: string;
  pagination?: boolean;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  searchable?: boolean;
  filterable?: boolean;
  loading?: boolean;
  darkMode?: boolean;
}

const Table: React.FC<TableProps> = ({
  columns,
  data,
  title,
  description,
  pagination = true,
  searchable = true,
  filterable = true,
  loading = false,
  pageSize: initialPageSize = 10,
  totalItems = 0,
  totalPages = 0,
  currentPage: initialCurrentPage = 1,
  onPageChange,
  onPageSizeChange,
  darkMode = false,
}) => {
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchTerm, setSearchTerm] = useState('');

  // Update local state when props change
  useEffect(() => {
    setCurrentPage(initialCurrentPage);
  }, [initialCurrentPage]);

  useEffect(() => {
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  // Get value from row by accessor
  const getValue = (row: any, accessor: string) => {
    if (!row) return null;

    // Handle nested properties
    if (accessor.includes('.')) {
      const props = accessor.split('.');
      let value = row;
      for (const prop of props) {
        if (value === null || value === undefined) return null;
        value = value[prop];
      }
      return value;
    }
    return row[accessor] ?? null;
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onPageChange?.(page);
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    onPageSizeChange?.(newPageSize);
  };

  // Filter data based on search term
  const filteredData = data.filter((row) => {
    if (!searchTerm) return true;
    return columns.some((column) => {
      const value = getValue(row, column.accessor);
      return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  return (
    <div className={`
      card-premium overflow-hidden border transition-all duration-200 animate-fade-in
      ${darkMode ? 'bg-neutral-900/50 backdrop-blur-md border-neutral-800/50' : 'bg-white border-neutral-200/60'}
    `}>
      {/* Premium Header */}
      {(title || searchable || filterable) && (
        <div className={`p-5 border-b ${darkMode ? 'border-neutral-800/50 bg-neutral-900/30' : 'border-neutral-200/80 bg-neutral-50/50'} flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4`}>
          {title && (
            <div>
              <h2 className={`text-lg font-bold font-display ${darkMode ? 'text-white' : 'text-neutral-900'}`}>
                {title}
              </h2>
              {description && (
                <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-500'} mt-1`}>
                  {description}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            {searchable && (
              <div className="relative">
                <div className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none ${darkMode ? 'text-neutral-400' : 'text-neutral-400'}`}>
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`
                    block w-full pl-10 pr-4 py-2.5 rounded-lg text-sm transition-all duration-200
                    ${darkMode
                      ? 'bg-neutral-800/50 border-neutral-700 text-white placeholder-neutral-400 focus:border-primary-500 focus:ring-primary-500/20'
                      : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:ring-primary-500/20'
                    } border
                  `}
                  placeholder="Search..."
                />
              </div>
            )}

            {filterable && (
              <button
                type="button"
                className={`
                  inline-flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${darkMode
                    ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                    : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                  } border shadow-soft
                `}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </button>
            )}

            <button
              type="button"
              className="inline-flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 text-white hover:opacity-90 shadow-banking" style={{background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'}}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      )}

      {/* Premium Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className={darkMode ? 'bg-neutral-900/30' : 'bg-neutral-50/50'}>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`
                    px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider
                    ${darkMode ? 'text-neutral-300' : 'text-neutral-600'}
                    ${column.className || ''}
                  `}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-neutral-800/50 bg-neutral-900/20' : 'divide-neutral-200 bg-white'}`}>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={`px-6 py-12 text-center ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="spinner w-6 h-6"></div>
                    <span className="text-sm font-medium">Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={`px-6 py-12 text-center ${darkMode ? 'text-neutral-400' : 'text-neutral-500'}`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-neutral-800' : 'bg-neutral-100'} flex items-center justify-center`}>
                      <MoreHorizontal className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium">No data available</span>
                    <span className="text-xs">Try adjusting your search or filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`
                    transition-all duration-200
                    ${darkMode
                      ? 'hover:bg-neutral-800/30'
                      : 'hover:bg-neutral-50/80'
                    }
                  `}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className={`
                        px-5 py-3.5 whitespace-nowrap text-sm font-medium
                        ${darkMode ? 'text-neutral-300' : 'text-neutral-700'}
                        ${column.className || ''}
                      `}
                    >
                      {column.cell
                        ? column.cell(getValue(row, column.accessor), row)
                        : getValue(row, column.accessor)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Premium Pagination */}
      {pagination && (
        <div className={`
          flex items-center justify-between px-5 py-4 border-t
          ${darkMode ? 'border-neutral-800/50 bg-neutral-900/30' : 'border-neutral-200/80 bg-neutral-50/50'}
        `}>
          <div className="flex justify-between flex-1 lg:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`
                relative inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl shadow-soft transition-all duration-300
                ${darkMode
                  ? 'text-neutral-300 bg-neutral-800/50 border-neutral-700 hover:bg-neutral-700/50 disabled:opacity-50'
                  : 'text-neutral-700 bg-white/50 border-neutral-200 hover:bg-neutral-100/50 disabled:opacity-50'
                } border backdrop-blur-sm
              `}
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`
                relative inline-flex items-center px-4 py-2 ml-3 text-sm font-semibold rounded-xl shadow-soft transition-all duration-300
                ${darkMode
                  ? 'text-neutral-300 bg-neutral-800/50 border-neutral-700 hover:bg-neutral-700/50 disabled:opacity-50'
                  : 'text-neutral-700 bg-white/50 border-neutral-200 hover:bg-neutral-100/50 disabled:opacity-50'
                } border backdrop-blur-sm
              `}
            >
              Next
            </button>
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Showing <span className="font-bold">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span> to{' '}
                <span className="font-bold">
                  {Math.min(currentPage * pageSize, totalItems)}
                </span>{' '}
                of <span className="font-bold">{totalItems}</span> results
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className={`
                  block rounded-lg shadow-soft text-sm font-medium transition-all duration-200
                  ${darkMode
                    ? 'bg-neutral-800/50 border-neutral-700 text-neutral-300 focus:border-primary-500 focus:ring-primary-500/20'
                    : 'bg-white border-neutral-300 text-neutral-700 focus:border-primary-500 focus:ring-primary-500/20'
                  } border
                `}
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
              <nav className="relative z-0 inline-flex rounded-xl shadow-soft -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`
                    relative inline-flex items-center px-3 py-2 rounded-l-xl text-sm font-semibold transition-all duration-300
                    ${darkMode
                      ? 'text-neutral-400 bg-neutral-800/50 border-neutral-700 hover:bg-neutral-700/50 disabled:opacity-50'
                      : 'text-neutral-500 bg-white/50 border-neutral-200 hover:bg-neutral-100/50 disabled:opacity-50'
                    } border backdrop-blur-sm
                  `}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Generate page numbers with ellipsis */}
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 5;

                  if (totalPages <= maxVisiblePages) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    pages.push(1);

                    if (currentPage <= 3) {
                      for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
                        pages.push(i);
                      }
                      if (totalPages > 5) {
                        pages.push('...');
                      }
                    } else if (currentPage >= totalPages - 2) {
                      if (totalPages > 5) {
                        pages.push('...');
                      }
                      for (let i = Math.max(2, totalPages - 4); i < totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      pages.push('...');
                      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                        pages.push(i);
                      }
                      pages.push('...');
                    }

                    if (totalPages > 1) {
                      pages.push(totalPages);
                    }
                  }

                  return pages.map((page, index) => (
                    <React.Fragment key={index}>
                      {page === '...' ? (
                        <span className={`
                          relative inline-flex items-center px-4 py-2 border text-sm font-semibold
                          ${darkMode
                            ? 'bg-neutral-800/50 border-neutral-700 text-neutral-500'
                            : 'bg-white/50 border-neutral-200 text-neutral-600'
                          } backdrop-blur-sm
                        `}>
                          ...
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePageChange(page as number)}
                          className={`
                            relative inline-flex items-center px-3.5 py-2 border text-sm font-medium transition-all duration-200
                            ${page === currentPage
                              ? 'z-10 border-primary-600 text-white shadow-banking'
                              : darkMode
                                ? 'bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:bg-neutral-700/50 hover:text-white'
                                : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                            }
                          `}
                          style={page === currentPage ? {background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'} : {}}
                        >
                          {page}
                        </button>
                      )}
                    </React.Fragment>
                  ));
                })()}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`
                    relative inline-flex items-center px-3 py-2 rounded-r-xl text-sm font-semibold transition-all duration-300
                    ${darkMode
                      ? 'text-neutral-400 bg-neutral-800/50 border-neutral-700 hover:bg-neutral-700/50 disabled:opacity-50'
                      : 'text-neutral-500 bg-white/50 border-neutral-200 hover:bg-neutral-100/50 disabled:opacity-50'
                    } border backdrop-blur-sm
                  `}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;