export const mentors = [
  { id: 1, name: 'Ananya Rao', role: 'Senior Engineer, Google', field: 'Software', college: 'IIT Delhi', degree: 'B.Tech', careers: ['Software Engineer', 'Backend Developer'], skills: ['Python', 'System design', 'DSA'], rate: 999, rating: 4.9, bio: 'Backend, system design and breaking into tech.' },
  { id: 2, name: 'Vikram Shah', role: 'Design Director', field: 'Design', college: 'NID Ahmedabad', degree: 'B.Des', careers: ['UX Designer', 'Design Lead'], skills: ['Figma', 'Portfolio review', 'UX research'], rate: 1499, rating: 4.8, bio: 'Portfolio reviews and UX career advice.' },
  { id: 3, name: 'Meera Iyer', role: 'Founder, EduNest', field: 'Startups', college: 'IIM Bangalore', degree: 'MBA', careers: ['Founder', 'Product Manager'], skills: ['Fundraising', 'Pitching', 'Strategy'], rate: 2999, rating: 4.7, bio: 'Ideas, fundraising and first hires.' },
  { id: 4, name: 'Rahul Verma', role: 'Data Scientist, Flipkart', field: 'Data', college: 'IIT Bombay', degree: 'M.Tech', careers: ['Data Scientist', 'ML Engineer'], skills: ['Python', 'Machine learning', 'SQL'], rate: 1299, rating: 4.8, bio: 'ML, analytics and data careers.' },
  { id: 5, name: 'Sara Khan', role: 'Product Manager, Razorpay', field: 'Product', college: 'Delhi University', degree: 'B.Sc', careers: ['Product Manager'], skills: ['Roadmapping', 'Interview prep', 'Analytics'], rate: 799, rating: 4.6, bio: 'Product strategy and interview prep.' },
  { id: 6, name: 'Dev Malhotra', role: 'Investment Analyst', field: 'Finance', college: 'SRCC Delhi', degree: 'B.Com', careers: ['Investment Analyst', 'Consultant'], skills: ['Excel', 'Valuation', 'MBA prep'], rate: 1999, rating: 4.7, bio: 'Finance careers and MBA applications.' },
  { id: 7, name: 'Dr. Isha Nair', role: 'Resident Doctor, AIIMS', field: 'Medicine', college: 'AIIMS Delhi', degree: 'MBBS', careers: ['Doctor', 'Medical Researcher'], skills: ['NEET PG', 'Research', 'Clinical skills'], rate: 699, rating: 4.9, bio: 'Medical entrance, residency and research.' },
  { id: 8, name: 'Rohan Gupta', role: 'Higher-studies Advisor', field: 'Education', college: 'DTU Delhi', degree: 'B.Tech', careers: ['Study Abroad Consultant'], skills: ['GRE', 'SOP writing', 'Scholarships'], rate: 199, rating: 4.5, bio: 'Applications, SOPs and scholarships abroad.' },
]
// keyword search: every word must appear in name, role, field, college, degree, careers, skills or bio
export const matchMentor = (m, q) => {
  const blob = [m.name, m.role, m.field, m.college, m.degree, m.bio, ...m.careers, ...m.skills].join(' ').toLowerCase()
  return q.toLowerCase().split(/[\s,]+/).filter(Boolean).every((t) => blob.includes(t))
}
export const EXPERTISE = ['Resume & interviews', 'Internships & placements', 'Portfolio review', 'Higher studies', 'Study abroad', 'Competitive exams', 'Coding / DSA', 'System design', 'Data science & ML', 'Product management', 'Design / UX', 'Startups & funding', 'Finance & MBA', 'Medicine / NEET', 'Research & publishing', 'Career switching', 'Public speaking']
const t = Date.now()
export const seed = {
  user: null, theme: 'dark', bellPos: null, currency: 'INR',
  wallet: { student: 2000, mentor: 0 }, tx: [],
  sessions: [], saved: [], registered: [],
  reviews: [
    { id: 1, mentor: '__me__', from: 'Priya S.', rating: 5, text: 'Clear, practical advice on my resume. Highly recommend.', time: t - 2 * 864e5 },
    { id: 2, mentor: '__me__', from: 'Arjun K.', rating: 4, text: 'Great portfolio feedback. Would love more examples.', time: t - 5 * 864e5 },
    { id: 3, mentor: '__me__', from: 'Neha T.', rating: 5, text: 'Helped me prepare for my MBA interviews.', time: t - 9 * 864e5 },
    { id: 4, mentor: '__me__', from: 'Kabir R.', rating: 4, text: 'Patient and well prepared.', time: t - 14 * 864e5 },
  ],
  notifPrefs: { messages: true, sessions: true, events: true, resources: true },
  notifs: [
    { id: 1, type: 'system', text: 'Welcome to Guidly. Complete your profile to get started.', read: false, time: t - 36e5 },
    { id: 2, type: 'events', text: 'New free event: Resume clinic — free 1:1 reviews.', read: false, time: t - 72e5 },
    { id: 3, type: 'messages', text: 'Ananya Rao sent you a message.', read: false, time: t - 864e5 },
    { id: 4, type: 'resources', text: 'New resource shared: Interview prep checklist.', read: true, time: t - 1728e5 },
  ],
  threads: {
    student: { 'Ananya Rao': [{ from: 'them', text: 'Hi! Tell me what you are stuck on and we can plan a session.' }] },
    mentor: { 'Priya S.': [{ from: 'them', text: 'Hello! Can you review my resume this week?' }], 'Arjun K.': [], 'Neha T.': [] },
  },
  mentees: [{ name: 'Priya S.' }, { name: 'Arjun K.' }, { name: 'Neha T.' }],
  events: [
    { id: 1, title: 'Resume clinic: free 1:1 reviews', host: 'Kavya M. (new mentor)', date: '2026-10-18', desc: 'Free 20-minute resume reviews to start building my mentoring practice.' },
    { id: 2, title: 'Intro to UX: ask me anything', host: 'Rohit D. (new mentor)', date: '2026-10-22', desc: 'Open Q&A for students curious about design careers.' },
  ],
  resources: [
    { id: 1, title: 'Interview prep checklist', by: 'Ananya Rao', link: 'https://example.com/interview-checklist' },
    { id: 2, title: 'Portfolio review template', by: 'Vikram Shah', link: 'https://example.com/portfolio-template' },
  ],
  profile: { student: {}, mentor: {} },
}

// display-only conversion (edit to taste)
export const INR_RATE = 85
export const money = (inr, cur = 'INR') => (cur === 'USD' ? '$' + +(inr / INR_RATE).toFixed(2) : '₹' + Math.round(inr).toLocaleString('en-IN'))
