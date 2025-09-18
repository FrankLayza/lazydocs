// async function getWebFeatures(featureId){
//     const webFeatures = await import('web-features')
//     const {features} = webFeatures


//     return features[featureId]?.status.baseline;
// }

// module.exports = {getWebFeatures}


(async () => {
  const { features } = await import("web-features");
  console.log(features.fetch.status.baseline);
})();
