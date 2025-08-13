import mongoose from 'mongoose';

export const queryBuilder = (baseQuery = {}, options = {}) => {
  const {
    search,
    searchFields = [],
    filters = {},
    sort = { createdAt: -1 },
    page = 1,
    limit = 20
  } = options;

  let query = { ...baseQuery };

  // Add search conditions
  if (search && searchFields.length > 0) {
    query.$or = searchFields.map(field => ({
      [field]: { $regex: search, $options: 'i' }
    }));
  }

  // Add filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query[key] = value;
    }
  });

  return {
    query,
    sort,
    skip: (page - 1) * limit,
    limit: parseInt(limit)
  };
};

export const populateFields = async (model, docs, populateConfig = {}) => {
  if (!docs || docs.length === 0) return docs;

  try {
    // Convert single document to array for consistent handling
    const documents = Array.isArray(docs) ? docs : [docs];
    
    // Get unique IDs for each field to populate
    const populateIds = {};
    Object.entries(populateConfig).forEach(([field, config]) => {
      populateIds[field] = [...new Set(
        documents
          .map(doc => doc[field])
          .filter(id => id && mongoose.Types.ObjectId.isValid(id))
      )];
    });

    // Fetch related documents
    const populatedData = {};
    await Promise.all(
      Object.entries(populateConfig).map(async ([field, config]) => {
        if (populateIds[field].length > 0) {
          const relatedDocs = await config.model.find({
            _id: { $in: populateIds[field] }
          }).select(config.select);

          populatedData[field] = relatedDocs.reduce((acc, doc) => {
            acc[doc._id.toString()] = doc;
            return acc;
          }, {});
        }
      })
    );

    // Populate the documents
    const populated = documents.map(doc => {
      const docObj = doc.toObject ? doc.toObject() : { ...doc };
      
      Object.entries(populateConfig).forEach(([field]) => {
        if (docObj[field] && populatedData[field]?.[docObj[field].toString()]) {
          docObj[field] = populatedData[field][docObj[field].toString()];
        }
      });

      return docObj;
    });

    return Array.isArray(docs) ? populated : populated[0];
  } catch (error) {
    console.error('Population error:', error);
    return docs;
  }
};
