import mongoose from 'mongoose';
import Task from '../models/task.model.js';
import { connectDB } from '../lib/db.js';

const fixAttachmentUrls = async () => {
  try {
    await connectDB();
    const tasks = await Task.find({ 'attachments.url': { $regex: /^https:\/\/example.com/ } });

    for (const task of tasks) {
      let modified = false;
      for (const attachment of task.attachments) {
        if (attachment.url.startsWith('https://example.com')) {
          const filename = attachment.url.split('-').pop();
          attachment.url = `/uploads/${filename}`;
          modified = true;
        }
      }
      if (modified) {
        await task.save();
        console.log(`Updated attachments for task: ${task._id}`);
      }
    }

    console.log('Finished fixing attachment URLs.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error fixing attachment URLs:', error);
    process.exit(1);
  }
};

fixAttachmentUrls();
