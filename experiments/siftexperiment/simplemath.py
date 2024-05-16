import numpy as np

def cosine(u, v):
	return max(0, min(correlation(u, v), 2.0))

def correlation(u, v):
	uv = np.average(u * v)
	uu = np.average(np.square(u))
	vv = np.average(np.square(v))
	dist = 1.0 - uv / np.sqrt(uu * vv)
	return np.abs(dist)

def logsumexp(a):
	a_max = np.amax(a, axis=1, keepdims=True)
	if a_max.ndim > 0:
		a_max[~np.isfinite(a_max)] = 0
	elif not np.isfinite(a_max):
		a_max = 0
	tmp = np.exp(a - a_max)
	with np.errstate(divide='ignore'):
		s = np.sum(tmp, axis=1, keepdims=False)
		out = np.log(s)
	a_max = np.squeeze(a_max, axis=1)
	out += a_max
	return out

def estimate_log_gaussian_prob(X, means, precisions_chol, covariance_type):
	n_samples, n_features = X.shape
	n_components, _ = means.shape
	log_det = compute_log_det_cholesky(precisions_chol, covariance_type, n_features)
	if covariance_type == "full":
		log_prob = np.empty((n_samples, n_components))
		for k, (mu, prec_chol) in enumerate(zip(means, precisions_chol)):
			y = np.dot(X, prec_chol) - np.dot(mu, prec_chol)
			log_prob[:, k] = np.sum(np.square(y), axis=1)
	elif covariance_type == "tied":
		log_prob = np.empty((n_samples, n_components))
		for k, mu in enumerate(means):
			y = np.dot(X, precisions_chol) - np.dot(mu, precisions_chol)
			log_prob[:, k] = np.sum(np.square(y), axis=1)
	elif covariance_type == "diag":
		precisions = precisions_chol**2
		log_prob = (
			np.sum((means**2 * precisions), 1)
			- 2.0 * np.dot(X, (means * precisions).T)
			+ np.dot(X**2, precisions.T)
		)
	elif covariance_type == "spherical":
		precisions = precisions_chol**2
		log_prob = (
			np.sum(means**2, 1) * precisions
			- 2 * np.dot(X, means.T * precisions)
			+ np.outer(row_norms(X, squared=True), precisions)
		)
	return -0.5 * (n_features * np.log(2 * np.pi) + log_prob) + log_det

def compute_log_det_cholesky(matrix_chol, covariance_type, n_features):
	if covariance_type == "full":
		n_components, _, _ = matrix_chol.shape
		log_det_chol = np.sum(
			np.log(matrix_chol.reshape(n_components, -1)[:, :: n_features + 1]), 1
		)
	elif covariance_type == "tied":
		log_det_chol = np.sum(np.log(np.diag(matrix_chol)))
	elif covariance_type == "diag":
		log_det_chol = np.sum(np.log(matrix_chol), axis=1)
	else:
		log_det_chol = n_features * (np.log(matrix_chol))
	return log_det_chol

class TrainedGaussianMixture:
	def __init__(self, gmm):
		self.weights_ = gmm.weights_
		self.means_ = gmm.means_
		self.covariances_ = gmm.covariances_
		self.precisions_cholesky_ = gmm.precisions_cholesky_
		self.covariance_type = gmm.covariance_type
		
	def predict_proba(self, X):
		_, log_resp = self._estimate_log_prob_resp(X)
		return np.exp(log_resp)

	def _estimate_log_prob_resp(self, X):
		weighted_log_prob = self._estimate_weighted_log_prob(X)
		log_prob_norm = logsumexp(weighted_log_prob)
		with np.errstate(under="ignore"):
			log_resp = weighted_log_prob - log_prob_norm[:, np.newaxis]
		return log_prob_norm, log_resp

	def _estimate_weighted_log_prob(self, X):
		return self._estimate_log_prob(X) + self._estimate_log_weights()

	def _estimate_log_prob(self, X):
		return estimate_log_gaussian_prob(X, self.means_, self.precisions_cholesky_, self.covariance_type)

	def _estimate_log_weights(self):
		return np.log(self.weights_)
