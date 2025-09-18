async function getWebFeatures(featureId){
    const webFeatures = await import('web-features')
    const {features} = webFeatures


    return features[featureId]?.status.baseline;
}

module.exports = {getWebFeatures}