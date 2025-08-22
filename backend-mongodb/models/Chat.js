const mongoose = require('mongoose');

// Message Schema
const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  message: {
    type: String,
    required: function() {
      return !this.attachments || this.attachments.length === 0;
    },
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'workout_share', 'nutrition_share'],
    default: 'text'
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'document']
    },
    url: String,
    filename: String,
    size: Number, // in bytes
    mimeType: String
  }],
  sharedContent: {
    type: {
      type: String,
      enum: ['workout_program', 'workout_session', 'nutrition_plan', 'progress_photo']
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId
    },
    metadata: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: Date,
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  originalMessage: String,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reaction: {
      type: String,
      enum: ['👍', '👎', '❤️', '😂', '😮', '😢', '😡']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Conversation Schema
const conversationSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['trainer', 'client'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastRead: {
      type: Date,
      default: Date.now
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    }
  }],
  conversationType: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct'
  },
  name: String, // For group conversations
  description: String,
  avatar: String,
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  messageCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    allowWorkoutSharing: {
      type: Boolean,
      default: true
    },
    autoDeleteMessages: {
      enabled: {
        type: Boolean,
        default: false
      },
      afterDays: {
        type: Number,
        default: 30
      }
    }
  },
  metadata: {
    clientProgramId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutProgram'
    },
    tags: [String],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, isRead: 1 });
messageSchema.index({ createdAt: -1 });

conversationSchema.index({ 'participants.user': 1, isActive: 1 });
conversationSchema.index({ lastActivity: -1 });

// Virtual for unread messages count
conversationSchema.virtual('unreadCount').get(function() {
  // This would be calculated in the query
  return this._unreadCount || 0;
});

// Static methods
messageSchema.statics.getConversationMessages = function(senderId, receiverId, options = {}) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  return this.find({
    $or: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId }
    ],
    isDeleted: false
  })
  .populate('senderId', 'name surname profileImageUrl')
  .populate('receiverId', 'name surname profileImageUrl')
  .populate('replyTo')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

conversationSchema.statics.findUserConversations = function(userId) {
  return this.find({
    'participants.user': userId,
    isActive: true
  })
  .populate('participants.user', 'name surname profileImageUrl role')
  .populate('lastMessage')
  .sort({ lastActivity: -1 });
};

// Instance methods
messageSchema.methods.markAsRead = function(userId) {
  if (this.receiverId.toString() === userId.toString() && !this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

conversationSchema.methods.addMessage = function(messageId) {
  this.lastMessage = messageId;
  this.lastActivity = new Date();
  this.messageCount += 1;
  return this.save();
};

conversationSchema.methods.updateLastRead = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.lastRead = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Pre-save middleware
messageSchema.pre('save', function(next) {
  if (this.isModified('message') && this.originalMessage) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

const Message = mongoose.model('Message', messageSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = {
  Message,
  Conversation
};