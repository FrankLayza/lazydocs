// async function getWebFeatures(featureId){
//     const webFeatures = await import('web-features')
//     const {features} = webFeatures


//     return features[featureId]?.status.baseline;
// }

// module.exports = {getWebFeatures}


async function getWebFeatures(featureId) {
  const { features } = await import("web-features");
  return features[featureId]?.status.baseline;
}

module.exports = { getWebFeatures };
