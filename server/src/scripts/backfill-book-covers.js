require('dotenv').config();
const Book = require('../models/book.model');
const coverResolverService = require('../services/cover/CoverResolverService');

async function main() {
  const limit = Number(process.argv[2] || 20);
  const books = await Book.findAll({
    limit,
    order: [['updatedAt', 'DESC']]
  });

  console.log(`准备回填 ${books.length} 本书的封面`);

  for (const book of books) {
    try {
      await coverResolverService.ensureBookCover(book, { forceRefresh: false, persist: true });
      console.log(`已处理: ${book.title} -> ${book.coverImage || '无封面'}`);
    } catch (error) {
      console.error(`处理失败: ${book.title}`, error.message);
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
