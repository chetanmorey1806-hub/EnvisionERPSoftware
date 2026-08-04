import api from './axios';

export const libraryApi = {
  searchBooks: (params) => api.get('/library/books', { params }),
  addBook: (bookData) => api.post('/library/books', bookData),
  issueBook: (data) => api.post('/library/issue', data),
  returnBook: (issueId) => api.post(`/library/return/${issueId}`)
};