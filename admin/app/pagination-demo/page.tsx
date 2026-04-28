'use client';

import React, { useState } from 'react';
import { Pagination } from '../components';

export default function PaginationDemo() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalItems = 250;

  const handlePageChange = (page: number) => {
    console.log('Page changed to:', page);
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    console.log('Page size changed to:', size);
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pagination Component Demo</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Default Pagination</h2>
            <div className="border rounded-lg bg-white">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Current State</h2>
            <div className="grid grid-cols-2 gap-4 bg-gray-100 p-4 rounded-lg font-mono text-sm">
              <div>
                <p className="text-gray-500">Current Page:</p>
                <p className="text-blue-600 font-bold">{currentPage}</p>
              </div>
              <div>
                <p className="text-gray-500">Page Size:</p>
                <p className="text-blue-600 font-bold">{pageSize}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Items:</p>
                <p className="text-gray-900">{totalItems}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Pages:</p>
                <p className="text-gray-900">{Math.ceil(totalItems / pageSize)}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Pagination without Page Size Selector</h2>
            <div className="border rounded-lg bg-white">
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={20}
                onPageChange={handlePageChange}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Small Dataset (1 page)</h2>
            <div className="border rounded-lg bg-white">
              <Pagination
                currentPage={1}
                totalItems={5}
                pageSize={10}
                onPageChange={() => {}}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
