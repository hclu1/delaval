//DataTable.tsx
import React, { useState } from 'react';
import {Edit2, Trash2, ChevronLeft, ChevronRight} from 'lucide-react';
import { Button } from '../common/Button';
import { SearchBar } from '../common/SearchBar';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: any) => React.ReactNode;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  onEdit?: (item: any) => void;
  onDelete?: (itemId: string) => void; // ✅ CORRECTION : Accepte un string (ID) au lieu d'un objet
  itemsPerPage?: number;
}

export function DataTable({ data, columns, onEdit, onDelete, itemsPerPage = 10 }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search
  const filteredData = (data || []).filter((item) =>
    Object.values(item).some((value) =>
      String(value).toLowerCase().includes((searchQuery || '').toLowerCase())
    )
  );

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // ✅ NOUVELLE FONCTION : Gestion de la suppression avec confirmation
  const handleDelete = async (item: any) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      return;
    }

    try {
      if (onDelete) {
        // ✅ CORRECTION CRITIQUE : Passer l'ID (string) et non l'objet complet
        await onDelete(item._id);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de l\'élément');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Rechercher..."
        className="w-full"
      />

      {/* Table - Desktop */}
      <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {sortColumn === column.key && (
                      <span className="text-blue-600">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-4 text-center text-gray-500">
                  Aucune donnée disponible
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr key={item._id || item.id || index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.render
                        ? column.render(item[column.key], item)
                        : typeof item[column.key] === 'boolean'
                        ? item[column.key]
                          ? '✓'
                          : '✗'
                        : String(item[column.key] || '-')}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {onEdit && (
                          <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                            <Edit2 size={16} />
                          </Button>
                        )}
                        {onDelete && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(item)} // ✅ CORRECTION : Utiliser handleDelete
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {paginatedData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune donnée disponible
          </div>
        ) : (
          paginatedData.map((item, index) => (
            <div key={item._id || item.id || index} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
              {(onEdit || onDelete) && (
                <div className="flex justify-start gap-2 pb-2 border-b border-gray-100">
                  {onEdit && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                      <Edit2 size={16} />
                    </Button>
                  )}
                  {onDelete && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(item)} // ✅ CORRECTION : Utiliser handleDelete
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
                  )}
                </div>
              )}
              {columns.map((column) => (
                <div key={column.key} className="flex justify-between items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">{column.label}:</span>
                  <span className="text-sm text-gray-900 text-right flex-1">
                    {column.render
                      ? column.render(item[column.key], item)
                      : typeof item[column.key] === 'boolean'
                      ? item[column.key]
                        ? '✓'
                        : '✗'
                      : String(item[column.key] || '-')}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-700">
            {startIndex + 1} à {Math.min(startIndex + itemsPerPage, sortedData.length)} sur {sortedData.length}
          </p>
          <div className="flex gap-2 items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="px-3 py-1 text-xs sm:text-sm text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}