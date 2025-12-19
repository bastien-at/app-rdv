import { useState, useEffect, useRef } from 'react';
import { Search, Users, Mail, Phone, Calendar } from 'lucide-react';
import { CustomerSearchResult } from '../types';
import { searchCustomers } from '../services/api';

interface CustomerAutocompleteProps {
  storeId: string;
  onSelect: (customer: CustomerSearchResult) => void;
  placeholder?: string;
  className?: string;
}

export default function CustomerAutocomplete({ 
  storeId, 
  onSelect, 
  placeholder = "Rechercher un client...",
  className = ""
}: CustomerAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length >= 2 && storeId) {
      const debounceTimer = setTimeout(async () => {
        setLoading(true);
        try {
          const customers = await searchCustomers(storeId, query);
          setResults(customers);
          setIsOpen(customers.length > 0);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('Erreur recherche clients:', error);
          setResults([]);
          setIsOpen(false);
        } finally {
          setLoading(false);
        }
      }, 300);

      return () => clearTimeout(debounceTimer);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, storeId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = (customer: CustomerSearchResult) => {
    onSelect(customer);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
        {!loading && query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p>Aucun client trouvé</p>
            </div>
          ) : (
            results.map((customer, index) => (
              <button
                key={customer.id}
                onClick={() => handleSelect(customer)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate">
                        {customer.firstname} {customer.lastname}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-3 w-3 mr-2 text-gray-400" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Phone className="h-3 w-3 mr-2 text-gray-400" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Calendar className="h-3 w-3 mr-2 text-gray-400" />
                        <span className="text-xs">
                          {customer.total_bookings} réservation{customer.total_bookings > 1 ? 's' : ''}
                        </span>
                        <span className="mx-2">•</span>
                        <span className="text-xs">
                          Dernière: {formatDate(customer.last_booking_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
