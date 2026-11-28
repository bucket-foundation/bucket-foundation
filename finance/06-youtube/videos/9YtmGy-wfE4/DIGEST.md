<!-- voice-ignore-file: transcript-derived digest -->
# 2. Linear Algebra | MIT OpenCourseWare | 9YtmGy-wfE4 | 1.21 h

Teaches: A review of the linear algebra the MIT 18.S096 finance course reuses: eigenvalue decomposition, singular value decomposition (SVD) with a worked 2 by 3 example, and the Perron-Frobenius theorem. A guest speaker adds the reading of SVD on stock-price data.

Claims:
- A matrix is a data table (rows are stocks, columns are dates) and also a linear transformation from n-dimensional to m-dimensional space. "we can index the rows by stocks" [0:01:51]
- An eigenvector satisfies A v = lambda v; the condition det(A - lambda I) = 0 is a degree-n polynomial, so every square matrix has at least one eigenvalue, possibly complex. "and eigenvector if it satisfies this condition" [0:08:49]
- Real symmetric matrices are orthonormally diagonalizable and have real eigenvalues; the lecturer proves the real-eigenvalue part with a complex-conjugate argument. "v now take the complex conjugate real" [0:20:12]
- SVD works for any m by n matrix: A = U Sigma V^T with U and V orthonormal. Find eigenvalues of A^T A, set sigma as their square roots, take V from the eigenvectors and u_i = A v_i / sigma_i. "matrix so lambda n and corresponding eigenvectors" [0:34:51]
- Worked example: A = [3 2 2; 2 3 -2]; A^T A has eigenvalues 25, 9 and 0, so sigma = 5, 3, 0. "the eigenvalues are 0 9 and 25" [0:48:03]
- The reduced SVD drops the columns tied to zero eigenvalues; for 5 companies and 365 days it avoids a 365 by 365 factor. "a 5 by 5 5 by 365" [0:57:38]
- The guest speaker says eigenvectors of A A^T, indexed by companies, show how the companies are correlated. "a group of companies that are correlated" [0:59:17]
- Perron-Frobenius (weak form): for a matrix with all positive entries there is a unique real largest-magnitude eigenvalue of multiplicity 1 with an all-positive eigenvector; it feeds the Ross recovery theorem late in the course. "a unique eigenvector which has positive entries" [1:06:08]

- Matrix as data and as operator, then eigen decomposition for symmetric matrices, then SVD for general matrices (constructive proof via A^T A, worked example, reduced form), then Perron-Frobenius with a sketch for the symmetric case. "perron frobenius and you really won't believe" [1:03:22]

Worked:
- Symmetric matrices give full control: real eigenvalues and an orthonormal eigenbasis. "it and moreover all eigenvalues are real" [0:22:27]
- The A^T A recipe gives a hand-computable SVD, and eigenvectors for zero eigenvalues can be dropped. "a transpose a we have to compute" [0:47:22]

Failed:
- Not every matrix is diagonalizable, which is why SVD is needed. "that happens if a matrix is diagonalizable" [0:13:16]
- The lecturer calls the SVD proof a little painful but says it gives a process for finding an SVD. "it was a little bit painful for me" [0:45:09]
- He gives no physical meaning for eigenvectors of the stock matrix and defers real data to later lectures. "very good explanation what its physical meaning" [0:59:23]
- Perron-Frobenius is stated only in a weak form; the remaining details are deferred to the lecture notes. "i will not work through the details of the rest i will post it on the lecture notes" [1:11:32]
