import React, { useEffect, useState } from 'react';
import { authorService } from '../../services/authorService';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BookStatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Search,
  Filter,
  BookOpen,
  DollarSign,
  Calendar,
  Layers,
  ShoppingBag,
  Printer,
  Barcode,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

const PRODUCTION_STAGES = [
  'Manuscript Received',
  'Editing',
  'Cover Design',
  'Typesetting',
  'Proofreading',
  'ISBN Assignment',
  'Printing',
  'Distribution Setup',
  'Published & Live',
];

export const MyBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Selected Book for Detail Drawer/Modal
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const res = await authorService.getBooks();
        if (res.success && res.data) {
          setBooks(res.data.books || []);
        }
      } catch (err) {
        setError(err.message || 'Failed to load books catalog');
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  // Filter & sort logic
  const filteredBooks = books
    .filter((book) => {
      const matchesSearch =
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.genre && book.genre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (book.isbn && book.isbn.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'published') {
        matchesStatus = book.status === 'Published & Live';
      } else if (statusFilter === 'in_production') {
        matchesStatus = book.status.toLowerCase().includes('in production');
      }

      let matchesPlatform = true;
      if (platformFilter !== 'all') {
        matchesPlatform = book.available_on && book.available_on.includes(platformFilter);
      }

      return matchesSearch && matchesStatus && matchesPlatform;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.publication_date || 0) - new Date(a.publication_date || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.publication_date || 0) - new Date(b.publication_date || 0);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'copiesSold') {
        return (b.total_copies_sold || 0) - (a.total_copies_sold || 0);
      }
      return 0;
    });

  // Determine stage index for progress tracker
  const getStageIndex = (status) => {
    if (status === 'Published & Live') return 8;
    if (status.includes('Cover Design')) return 2;
    if (status.includes('Typesetting')) return 3;
    if (status.includes('Editing')) return 1;
    if (status.includes('Proofreading')) return 4;
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">
            My Books
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Complete publishing catalog, distribution channels, and sales tracking.
          </p>
        </div>
        <div className="text-xs font-semibold text-ink-600 bg-paper-100 px-3 py-1.5 rounded-lg border border-paper-200">
          Showing {filteredBooks.length} of {books.length} Books
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-4 flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, genre, or ISBN..."
              className="w-full pl-10 pr-4 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-44 px-3 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-sm text-ink-800 focus:outline-none focus:border-brand"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published & Live</option>
            <option value="in_production">In Production</option>
          </select>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="w-full md:w-44 px-3 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-sm text-ink-800 focus:outline-none focus:border-brand"
          >
            <option value="all">All Platforms</option>
            <option value="Amazon India">Amazon India</option>
            <option value="Flipkart">Flipkart</option>
            <option value="Amazon US">Amazon US</option>
            <option value="BookLeaf Store">BookLeaf Store</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full md:w-44 px-3 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-sm text-ink-800 focus:outline-none focus:border-brand"
          >
            <option value="newest">Newest Published</option>
            <option value="oldest">Oldest Published</option>
            <option value="title">Title (A-Z)</option>
            <option value="copiesSold">Copies Sold (High to Low)</option>
          </select>
        </CardBody>
      </Card>

      {/* Books Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => {
            const isLive = book.status === 'Published & Live';

            return (
              <Card
                key={book._id}
                hover
                className="flex flex-col cursor-pointer transition hover:-translate-y-0.5"
                onClick={() => setSelectedBook(book)}
              >
                <CardBody className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Top Status & ID */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <BookStatusBadge status={book.status} />
                      <span className="font-mono text-xs text-ink-400 font-medium">{book.book_id}</span>
                    </div>

                    {/* Book Title & Genre */}
                    <h3 className="font-serif text-lg font-bold text-ink-950 tracking-tight leading-snug line-clamp-2">
                      {book.title}
                    </h3>
                    <p className="text-xs text-ink-500 font-medium mt-1">{book.genre}</p>

                    {/* Metadata details */}
                    <div className="mt-4 pt-3 border-t border-paper-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-ink-600">
                        <span className="flex items-center gap-1.5 text-ink-500">
                          <Barcode className="w-3.5 h-3.5" /> ISBN:
                        </span>
                        <span className="font-mono font-medium text-ink-800">
                          {book.isbn || <span className="italic text-ink-400">Assigned during prep</span>}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-ink-600">
                        <span className="flex items-center gap-1.5 text-ink-500">
                          <Calendar className="w-3.5 h-3.5" /> Published:
                        </span>
                        <span className="font-medium text-ink-800">
                          {book.publication_date ? (
                            new Date(book.publication_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          ) : (
                            <span className="text-amber-700 italic">In Production</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-ink-600">
                        <span className="flex items-center gap-1.5 text-ink-500">
                          <DollarSign className="w-3.5 h-3.5" /> MRP:
                        </span>
                        <span className="font-medium text-ink-800">
                          {book.mrp !== null ? `₹${book.mrp}` : <span className="italic text-ink-400">Pending pricing</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Financial / Sales Strip */}
                  <div className="mt-4 pt-3 border-t border-paper-200/80 bg-paper-50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-ink-400 block">Total Sold</span>
                      <span className="font-bold text-ink-900">{book.total_copies_sold || 0} copies</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-ink-400 block">Royalty Earned</span>
                      <span className="font-bold text-brand">₹{(book.total_royalty_earned || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No Books Match Your Criteria"
          description="Try clearing your search query or adjusting your filters to see more book records."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setPlatformFilter('all');
            setSortBy('newest');
          }}
        />
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <Modal
          isOpen={!!selectedBook}
          onClose={() => setSelectedBook(null)}
          title={selectedBook.title}
          subtitle={`Book ID: ${selectedBook.book_id} · Genre: ${selectedBook.genre}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            {/* Status & Highlights */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-paper-50 rounded-xl border border-paper-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-500">Lifecycle State:</span>
                <BookStatusBadge status={selectedBook.status} />
              </div>
              <div className="text-xs text-ink-600">
                <span className="font-semibold text-ink-800">Print Partner:</span>{' '}
                {selectedBook.print_partner || 'In-House Facilities (Delhi)'}
              </div>
            </div>

            {/* Publishing Stage Flow Diagram */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">
                Publishing Pipeline Progress
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PRODUCTION_STAGES.map((stage, idx) => {
                  const currentIdx = getStageIndex(selectedBook.status);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div
                      key={stage}
                      className={`p-2 rounded-lg border text-center text-[10px] font-medium leading-tight ${
                        isDone
                          ? 'bg-sage-light text-sage-dark border-sage/30'
                          : isCurrent
                          ? 'bg-brand text-white border-brand shadow-xs font-bold'
                          : 'bg-paper-100 text-ink-400 border-paper-200'
                      }`}
                    >
                      <span>{stage}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Financial & Distribution Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Financial Box */}
              <div className="p-4 rounded-xl border border-paper-200 bg-white space-y-2.5 text-xs">
                <h4 className="font-semibold text-ink-900 border-b border-paper-200 pb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-brand" /> Royalty & Financial Performance
                </h4>
                <div className="flex justify-between">
                  <span className="text-ink-500">MRP:</span>
                  <span className="font-semibold text-ink-900">
                    {selectedBook.mrp !== null ? `₹${selectedBook.mrp}` : 'Not yet set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Royalty / Copy:</span>
                  <span className="font-semibold text-ink-900">
                    {selectedBook.author_royalty_per_copy !== null
                      ? `₹${selectedBook.author_royalty_per_copy}`
                      : 'Pending finalization'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Copies Sold:</span>
                  <span className="font-bold text-ink-900">{selectedBook.total_copies_sold || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Total Royalty Earned:</span>
                  <span className="font-bold text-ink-900">₹{(selectedBook.total_royalty_earned || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Royalty Paid:</span>
                  <span className="font-semibold text-sage-dark">₹{(selectedBook.royalty_paid || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Royalty Pending:</span>
                  <span className="font-bold text-brand">₹{(selectedBook.royalty_pending || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Last Payout Date:</span>
                  <span className="font-medium text-ink-800">
                    {selectedBook.last_royalty_payout_date
                      ? new Date(selectedBook.last_royalty_payout_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'No payouts yet'}
                  </span>
                </div>
              </div>

              {/* Distribution & Channels Box */}
              <div className="p-4 rounded-xl border border-paper-200 bg-white space-y-2.5 text-xs">
                <h4 className="font-semibold text-ink-900 border-b border-paper-200 pb-1.5 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-ink-700" /> Platform Availability
                </h4>
                <div>
                  <span className="text-ink-500 block mb-1.5">Listed Channels:</span>
                  {selectedBook.available_on && selectedBook.available_on.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedBook.available_on.map((ch) => (
                        <span
                          key={ch}
                          className="px-2.5 py-1 rounded-md bg-paper-100 text-ink-800 font-medium text-[11px] border border-paper-300"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 italic">
                      Platform listings trigger after Publication & Distribution setup.
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-paper-200 text-ink-600 leading-relaxed">
                  <p className="text-[11px]">
                    <span className="font-semibold text-ink-800">Policy Note:</span> Distribution stock sync occurs every 24–48 hours. If a title shows as unavailable on Amazon or Flipkart, submit a support query for an instant re-sync.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-paper-200">
              <Button variant="outline" size="md" onClick={() => setSelectedBook(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
