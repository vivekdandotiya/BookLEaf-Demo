import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authorService } from '../../services/authorService';
import { ticketService } from '../../services/ticketService';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Textarea } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useToast } from '../../context/ToastContext';
import {
  HelpCircle,
  Paperclip,
  X,
  FileText,
  Send,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const SubmitTicket = () => {
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  const [bookId, setBookId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoadingBooks(true);
        const res = await authorService.getBooks();
        if (res.success && res.data) {
          setBooks(res.data.books || []);
        }
      } catch (err) {
        addToast({ type: 'error', message: 'Failed to load your books list' });
      } finally {
        setLoadingBooks(false);
      }
    };
    fetchBooks();
  }, [addToast]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newAttachments = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!subject.trim() || subject.trim().length < 5) {
      newErrors.subject = 'Subject must be at least 5 characters long';
    }
    if (!description.trim() || description.trim().length < 10) {
      newErrors.description = 'Please provide at least 10 characters detailing your issue';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload = {
        bookId: bookId && bookId !== 'general' ? bookId : null,
        subject: subject.trim(),
        description: description.trim(),
        attachments,
      };

      const res = await ticketService.createTicket(payload);
      if (res.success && res.data?.ticket) {
        addToast({
          type: 'success',
          message: `Ticket ${res.data.ticket.ticketNumber} created! AI classification running in background.`,
        });
        navigate(`/author/tickets/${res.data.ticket._id}`);
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to submit support ticket',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const bookOptions = [
    { value: 'general', label: 'General / Account Level Inquiry' },
    ...books.map((b) => ({
      value: b._id,
      label: `${b.title} (${b.status})`,
    })),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">
          Submit Support Query
        </h1>
        <p className="text-sm text-ink-600 mt-1">
          Raise a dedicated support ticket for royalties, ISBN, printing quality, or production status.
        </p>
      </div>

      <Card>
        <CardBody className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Book selector */}
            <Select
              label="Which book is this inquiry about?"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              options={bookOptions}
              disabled={loadingBooks}
              helperText="Select a published or in-production book, or choose General / Account Level."
            />

            {/* Subject */}
            <Input
              label="Subject Line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quarterly royalty payout date inquiry, ISBN barcode discrepancy, etc."
              error={errors.subject}
              required
            />

            {/* Detailed Description */}
            <Textarea
              label="Detailed Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Please describe your question or issue in detail. Include specific numbers, dates, or error screenshots where applicable."
              error={errors.description}
              helperText="Our AI operations assistant and support team use these details to investigate and resolve your request faster."
              required
            />

            {/* File Attachments (UI & metadata) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink-700 tracking-wide">
                Supporting Attachments (Optional)
              </label>

              <div className="border-2 border-dashed border-paper-300 rounded-xl p-4 text-center hover:border-brand/50 transition bg-paper-50/50">
                <input
                  type="file"
                  id="ticket-files"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="ticket-files"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <Paperclip className="w-5 h-5 text-ink-400" />
                  <span className="text-xs font-medium text-ink-700">
                    Click to attach photos of defects, sales receipts, or platform screenshots
                  </span>
                  <span className="text-[10px] text-ink-400">PNG, JPG, PDF up to 10MB</span>
                </label>
              </div>

              {/* Attachments List */}
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-paper-100 border border-paper-200 text-xs text-ink-800"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-brand shrink-0" />
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="text-[10px] text-ink-400">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="text-ink-400 hover:text-red-600 p-1 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notice */}
            <div className="p-4 bg-paper-100/70 rounded-xl border border-paper-200 flex items-start gap-3 text-xs text-ink-600 leading-relaxed">
              <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <span>
                <strong>AI-Assisted Operations:</strong> Upon submission, your query is automatically categorized and prioritized by our AI engine. A BookLeaf support representative will review and reply within guaranteed SLA timelines.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-paper-200">
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate('/author/tickets')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                icon={Send}
              >
                Submit Ticket
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
