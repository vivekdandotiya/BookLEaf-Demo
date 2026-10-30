import { Author } from '../models/Author.js';
import { Book } from '../models/Book.js';
import { Ticket } from '../models/Ticket.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getAuthorProfile = async (req, res, next) => {
  try {
    const author = await Author.findById(req.authorId);
    if (!author) {
      return errorResponse(res, 'Author profile not found', 404, 'AUTHOR_NOT_FOUND');
    }
    return successResponse(res, { author });
  } catch (error) {
    next(error);
  }
};

export const getAuthorBooks = async (req, res, next) => {
  try {
    const books = await Book.find({ authorId: req.authorId }).sort({ publication_date: -1, createdAt: -1 });
    return successResponse(res, { books });
  } catch (error) {
    next(error);
  }
};

export const getAuthorBookById = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Strict isolation: must match authorId and either _id or book_id
    const book = await Book.findOne({
      $and: [
        { authorId: req.authorId },
        { $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { book_id: id }] },
      ],
    });

    if (!book) {
      // 404 rather than 403 to prevent enumeration attacks
      return errorResponse(res, 'Book not found', 404, 'BOOK_NOT_FOUND');
    }

    return successResponse(res, { book });
  } catch (error) {
    next(error);
  }
};

export const getAuthorDashboard = async (req, res, next) => {
  try {
    const author = await Author.findById(req.authorId);
    if (!author) {
      return errorResponse(res, 'Author not found', 404, 'AUTHOR_NOT_FOUND');
    }

    const books = await Book.find({ authorId: req.authorId });

    let totalCopiesSold = 0;
    let totalRoyaltyEarned = 0;
    let totalRoyaltyPaid = 0;
    let totalRoyaltyPending = 0;
    let publishedCount = 0;
    let inProductionCount = 0;

    for (const b of books) {
      if (b.status === 'Published & Live') {
        publishedCount++;
      } else if (b.status.toLowerCase().includes('in production')) {
        inProductionCount++;
      }

      totalCopiesSold += Number(b.total_copies_sold) || 0;
      totalRoyaltyEarned += Number(b.total_royalty_earned) || 0;
      totalRoyaltyPaid += Number(b.royalty_paid) || 0;
      totalRoyaltyPending += Number(b.royalty_pending) || 0;
    }

    const recentTickets = await Ticket.find({ authorId: req.authorId })
      .populate('bookId', 'title book_id status')
      .sort({ createdAt: -1 })
      .limit(5);

    const stats = {
      author: {
        id: author._id,
        author_id: author.author_id,
        name: author.name,
        email: author.email,
        city: author.city,
        joined_date: author.joined_date,
      },
      counts: {
        totalBooks: books.length,
        publishedBooks: publishedCount,
        inProductionBooks: inProductionCount,
        totalCopiesSold,
      },
      financials: {
        totalRoyaltyEarned,
        totalRoyaltyPaid,
        totalRoyaltyPending,
        formattedEarned: `₹${totalRoyaltyEarned.toLocaleString('en-IN')}`,
        formattedPaid: `₹${totalRoyaltyPaid.toLocaleString('en-IN')}`,
        formattedPending: `₹${totalRoyaltyPending.toLocaleString('en-IN')}`,
      },
      recentTickets,
    };

    return successResponse(res, stats);
  } catch (error) {
    next(error);
  }
};
