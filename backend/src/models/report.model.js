// backend/src/models/report.model.js
import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['sales', 'performance', 'financial', 'client', 'custom'],
    default: 'custom'
  },
  filePath: {
    type: String
  },
  fileType: {
    type: String,
    enum: ['csv', 'xlsx', 'xls'],
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  data: {
    type: Array,
    default: []
  },
  columns: {
    type: [String],
    default: []
  },
  rowCount: {
    type: Number,
    default: function() {
      return this.data.length;
    }
  },
}, {
  timestamps: true
});

// Add indexes for better query performance
reportSchema.index({ name: 1 });
reportSchema.index({ type: 1 });
reportSchema.index({ uploadedBy: 1 });
reportSchema.index({ createdAt: 1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;