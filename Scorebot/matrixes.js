exports.multiplyByVector = (m, v) => {
    var result = [];
    for (var i = 0; i < m.length; i++) {
        for (var j = 0; j < v.length; j++) {
            var sum = 0;
            for (var k = 0; k < m[0].length; k++) {
                sum += m[i][k] * v[k];
            }
            result[i] = sum;
        }
    }
    return result;
}

exports.normalize = (vector, n) => {
  var sum = 0
  for (var i in vector)
    sum += vector[i]
  if (sum != 0)
    for (var i in vector)
      vector[i] /= sum
  else
    for (var i in vector)
      vector[i] = 1/n
}

exports.softmax = (vector, n) => {
  exports.normalize(vector, n)
  for (var i = 0; i < n; i++) {
    if (vector[i] == undefined) vector[i] = 0
    vector[i] = Math.exp(vector[i])
  }
  exports.normalize(vector, n)
}

exports.normalize_min0 = (vector, n) => {
  for (var i = 0; i < n; i++) {
    if (vector[i] == undefined) vector[i] = 0
    vector[i] = Math.max(vector[i], 0)
  }
  console.log("vector")
  console.log(vector)
  exports.normalize(vector, n)
  console.log(vector)
}

exports.transpose = (matrix) => {
  var store = []
  for (var j in matrix[0])
    store[j] = []
  for (var i in matrix)
    for (var j in matrix[i])
      store[j][i] = matrix[i][j]
  for (var i in store)
    for (var j in store[i])
      matrix[i][j] = store[i][j]
  
}

exports.pagerank = (matrix) => {
  var V = []
  for (var i in matrix[0])
    V[i] = 1/(matrix[0].length)
  for (var i = 0; i < 4; i++) {
    console.log(V)
    V = exports.multiplyByVector(matrix, V)
  }
  return V
}