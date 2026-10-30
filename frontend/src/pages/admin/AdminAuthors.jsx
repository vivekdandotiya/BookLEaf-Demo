import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BookStatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Skeleton } from '../../components/common/Skeleton';
import {
  Users,
  Search,
  BookOpen,
  MapPin,
  Calendar,
  DollarSign,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const AdminAuthors = () => {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState(null);

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        setLoading(true);
        const res = await adminService.getAuthors();
        if (res.success && res.data) {
          setAuthors(res.data.authors || []);
        }
      } catch (err) {
        console.error('Failed to load authors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthors();
  }, []);

  const filteredAuthors = authors.filter((a) => {
    return (
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.author_id.toLowerCase().includes(search.toLowerCase()) ||
      (a.city && a.city.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">
            Author Directory
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Complete list of 10 authors from BookLeaf sample dataset with associated titles and performance.
          </p>
        </div>
        <div className="text-xs font-semibold text-ink-600 bg-paper-200/70 px-3 py-1.5 rounded-lg border border-paper-300">
          Showing {filteredAuthors.length} Authors
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardBody className="p-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by author name, email, author ID (e.g. AUTH001), or city..."
              className="w-full pl-10 pr-4 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-sm text-ink-900 focus:outline-none focus:border-brand"
            />
          </div>
        </CardBody>
      </Card>

      {/* Authors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuthors.map((author) => {
            const totalBooks = author.books?.length || 0;
            const totalRoyaltyEarned = (author.books || []).reduce(
              (acc, b) => acc + (b.total_royalty_earned || 0),
              0
            );

            return (
              <Card
                key={author._id}
                hover
                className="cursor-pointer"
                onClick={() => setSelectedAuthor(author)}
              >
                <CardBody className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-brand bg-brand-light px-2 py-0.5 rounded">
                        {author.author_id}
                      </span>
                      <h3 className="font-serif text-lg font-bold text-ink-950 mt-1.5">{author.name}</h3>
                      <p className="text-xs text-ink-500">{author.email}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-paper-100 border border-paper-200 flex items-center justify-center font-bold text-ink-800">
                      {author.name.charAt(0)}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-paper-200/80 grid grid-cols-2 gap-2 text-xs text-ink-600">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-ink-400 block">City</span>
                      <span className="font-medium text-ink-800">{author.city}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-ink-400 block">Catalog</span>
                      <span className="font-bold text-ink-900">{totalBooks} Book(s)</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-paper-200/80 flex items-center justify-between text-xs">
                    <span className="text-ink-500">Total Royalty:</span>
                    <span className="font-bold text-brand">₹{totalRoyaltyEarned.toLocaleString('en-IN')}</span>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Author Detail Modal */}
      {selectedAuthor && (
        <Modal
          isOpen={!!selectedAuthor}
          onClose={() => setSelectedAuthor(null)}
          title={selectedAuthor.name}
          subtitle={`Author ID: ${selectedAuthor.author_id} · ${selectedAuthor.city}, India`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-paper-50 rounded-xl border border-paper-200 text-xs">
              <div>
                <span className="text-ink-400 block text-[10px] uppercase font-semibold">Email</span>
                <span className="font-medium text-ink-900 truncate block">{selectedAuthor.email}</span>
              </div>
              <div>
                <span className="text-ink-400 block text-[10px] uppercase font-semibold">Phone</span>
                <span className="font-medium text-ink-900">{selectedAuthor.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-ink-400 block text-[10px] uppercase font-semibold">Joined Date</span>
                <span className="font-medium text-ink-900">
                  {selectedAuthor.joined_date
                    ? new Date(selectedAuthor.joined_date).toLocaleDateString('en-IN')
                    : 'N/A'}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">
                Published & In-Production Titles ({selectedAuthor.books?.length || 0})
              </h4>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {selectedAuthor.books?.map((b) => (
                  <div
                    key={b._id}
                    className="p-3 rounded-lg border border-paper-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-ink-900 block">{b.title}</span>
                      <span className="text-[11px] text-ink-500 font-mono">
                        {b.book_id} · ISBN: {b.isbn || 'Pending'} · {b.genre}
                      </span>
                    </div>
                    <div className="text-right">
                      <BookStatusBadge status={b.status} />
                      <span className="text-[10px] text-ink-400 block mt-1">
                        Sold: {b.total_copies_sold || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-paper-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedAuthor(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
