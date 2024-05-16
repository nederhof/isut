import cv2
import os
import json
import numpy as np

from simplemath import cosine, TrainedGaussianMixture

def fisher_vector(xx, gmm):
	"""Computes the Fisher vector on a set of descriptors.
	Parameters
	----------
	xx: array_like, shape (N, D) or (D, )
		The set of descriptors
	gmm: instance of sklearn mixture.GMM object
		Gauassian mixture model of the descriptors.
	Returns
	-------
	fv: array_like, shape (K + 2 * D * K, )
		Fisher vector (derivatives with respect to the mixing weights, means
		and variances) of the given descriptors.
	Reference
	---------
	J. Krapac, J. Verbeek, F. Jurie.  Modeling Spatial Layout with Fisher
	Vectors for Image Categorization.  In ICCV, 2011.
	http://hal.inria.fr/docs/00/61/94/03/PDF/final.r1.pdf
	--
	From:
	https://gist.github.com/danoneata/9927923?permalink_comment_id=3539066
	--
	Alternative:
	https://python.hotexamples.com/examples/yael.yael/-/fvec_to_numpy/python-fvec_to_numpy-function-examples.html
	"""
	xx = np.atleast_2d(xx)
	N = xx.shape[0]

	# Compute posterior probabilities.
	Q = gmm.predict_proba(xx)  # NxK

	# Compute the sufficient statistics of descriptors.
	Q_sum = np.sum(Q, 0)[:, np.newaxis] / N
	Q_xx = np.dot(Q.T, xx) / N
	Q_xx_2 = np.dot(Q.T, xx ** 2) / N																
																										
	# Compute derivatives with respect to mixing weights, means and variances.						
	d_pi = Q_sum.squeeze() - gmm.weights_															
	d_mu = Q_xx - Q_sum * gmm.means_																	
	d_sigma = (																						
		- Q_xx_2
		- Q_sum * gmm.means_ ** 2																	
		+ Q_sum * gmm.covariances_																	
		+ 2 * Q_xx * gmm.means_)

	# Merge derivatives into a vector.																
	return np.hstack((d_pi, d_mu.flatten(), d_sigma.flatten()))

def nearest_instance(model, trainInstances, testInstance):
	bestDist = 1
	bestInstance = None
	fv = fisher_vector(testInstance['descriptors'], model)
	for trainInstance in trainInstances:
		dist = cosine(trainInstance['fisher'], fv)
		if dist < bestDist:
			bestDist = dist
			bestInstance = trainInstance
	return bestInstance, bestDist
