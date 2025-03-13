/**
 * 示例数据
 * 用于初始化数据库
 */

// 书籍数据
const books = [
  {
    title: '深度学习',
    author: '伊恩·古德费洛',
    description: '这是AI领域的经典之作，由三位深度学习领域的专家撰写。本书系统地介绍了深度学习的基本原理、数学基础和实际应用。',
    cover_image: '/src/images/book-covers/deep-learning.svg',
    categories: JSON.stringify(['人工智能', '计算机科学']),
    rating: 4.8,
    page_count: 802,
    publish_year: 2016,
    language: '中文',
    is_recommended: true,
    is_popular: true
  },
  {
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    description: '从十万年前有生命迹象开始，赫拉利带领读者跨越整个人类历史。这部全球现象级的畅销书，讲述了我们如何从狩猎采集者发展为当今世界的主宰者。',
    cover_image: '/src/images/book-covers/history-book.svg',
    categories: JSON.stringify(['历史', '人类学']),
    rating: 4.7,
    page_count: 464,
    publish_year: 2014,
    language: '中文',
    is_recommended: true,
    is_popular: true
  },
  {
    title: '未来简史',
    author: '尤瓦尔·赫拉利',
    description: '继《人类简史》之后，赫拉利的又一力作。本书探讨了人类面临的未来挑战，从人工智能到生物工程，思考人类将如何应对这些变革以及我们的命运将走向何方。',
    cover_image: '/src/images/book-covers/future-book.svg',
    categories: JSON.stringify(['未来学', '科技']),
    rating: 4.6,
    page_count: 378,
    publish_year: 2017,
    language: '中文',
    is_recommended: true,
    is_popular: true
  },
  {
    title: '思考，快与慢',
    author: '丹尼尔·卡尼曼',
    description: '诺贝尔经济学奖得主卡尼曼的代表作，揭示了人类思维的两种模式：快速、直觉的"系统1"和缓慢、理性的"系统2"，以及它们如何塑造我们的判断和决策。',
    cover_image: '/src/images/book-covers/psychology-book.svg',
    categories: JSON.stringify(['心理学', '行为经济学']),
    rating: 4.9,
    page_count: 512,
    publish_year: 2011,
    language: '中文',
    is_recommended: true,
    is_popular: true
  },
  {
    title: '原子习惯',
    author: '詹姆斯·克利尔',
    description: '这本书提供了一个简单而有效的框架，帮助读者建立积极的习惯，打破消极的习惯，掌握微小改变的力量，从而实现巨大的人生转变。',
    cover_image: '/src/images/book-covers/atomic-habits.svg',
    categories: JSON.stringify(['自我提升', '心理学']),
    rating: 4.5,
    page_count: 320,
    publish_year: 2018,
    language: '中文',
    is_recommended: false,
    is_popular: true
  },
  {
    title: '刻意练习',
    author: '安德斯·艾利克森',
    description: '本书揭示了卓越表现背后的秘密，提出了"刻意练习"的概念，解释了为什么天才不是天生的，而是通过特定类型的练习造就的。',
    cover_image: '/src/images/book-covers/deliberate-practice.svg',
    categories: JSON.stringify(['自我提升', '心理学']),
    rating: 4.0,
    page_count: 304,
    publish_year: 2016,
    language: '中文',
    is_recommended: false,
    is_popular: true
  },
  {
    title: '心理学入门',
    author: '卡罗尔·德韦克',
    description: '这本书是心理学领域的入门经典，涵盖了心理学的基本概念、理论和研究方法，适合对心理学感兴趣的初学者阅读。',
    cover_image: '/src/images/book-covers/psychology-book.svg',
    categories: JSON.stringify(['心理学', '教育']),
    rating: 5.0,
    page_count: 350,
    publish_year: 2015,
    language: '中文',
    is_recommended: false,
    is_popular: true
  },
  {
    title: '世界简史',
    author: '尤瓦尔·赫拉利',
    description: '这本书以宏大的视角概述了世界历史的发展脉络，从古代文明到现代社会，帮助读者理解人类历史的关键转折点和重要事件。',
    cover_image: '/src/images/book-covers/history-book.svg',
    categories: JSON.stringify(['历史', '世界史']),
    rating: 3.5,
    page_count: 420,
    publish_year: 2019,
    language: '中文',
    is_recommended: false,
    is_popular: true
  }
];

// 用户数据
const users = [
  {
    username: 'testuser',
    email: 'test@example.com',
    password: 'test123',
    role: 'user',
    is_active: true
  },
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    is_active: true
  }
];

// 书架数据
const bookshelves = [
  {
    user_id: 1, // testuser
    book_id: 1, // 深度学习
    is_favorite: true,
    reading_status: '阅读中',
    current_page: 150,
    notes: '这本书非常深入地讲解了深度学习的原理，需要慢慢消化。'
  },
  {
    user_id: 1, // testuser
    book_id: 2, // 人类简史
    is_favorite: true,
    reading_status: '已完成',
    current_page: 464,
    notes: '非常精彩的一本书，让我对人类历史有了全新的认识。'
  },
  {
    user_id: 1, // testuser
    book_id: 5, // 原子习惯
    is_favorite: false,
    reading_status: '未开始',
    current_page: 0,
    notes: ''
  },
  {
    user_id: 2, // admin
    book_id: 3, // 未来简史
    is_favorite: true,
    reading_status: '阅读中',
    current_page: 200,
    notes: '对未来的思考非常有启发性。'
  },
  {
    user_id: 2, // admin
    book_id: 4, // 思考，快与慢
    is_favorite: true,
    reading_status: '已完成',
    current_page: 512,
    notes: '这本书改变了我对思维方式的理解。'
  }
];

// 分类数据
const categories = [
  { name: '计算机科学', icon: 'laptop-code' },
  { name: '科学', icon: 'flask' },
  { name: '心理学', icon: 'brain' },
  { name: '历史', icon: 'landmark' },
  { name: '文学', icon: 'book-open' },
  { name: '经济学', icon: 'chart-line' },
  { name: '自我提升', icon: 'arrow-up' },
  { name: '人工智能', icon: 'robot' },
  { name: '人类学', icon: 'users' },
  { name: '未来学', icon: 'rocket' },
  { name: '科技', icon: 'microchip' },
  { name: '行为经济学', icon: 'chart-bar' },
  { name: '教育', icon: 'graduation-cap' },
  { name: '世界史', icon: 'globe' }
];

module.exports = {
  books,
  users,
  categories,
  bookshelves
}; 