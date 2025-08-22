const express = require('express');
const router = express.Router();
const { Message, Conversation } = require('../models/Chat');
const { auth } = require('../middleware/auth');

// Get user conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.findUserConversations(req.user.userId);

    // Add unread count for each conversation
    for (let conversation of conversations) {
      const unreadCount = await Message.countDocuments({
        receiverId: req.user.userId,
        senderId: { $in: conversation.participants.map(p => p.user._id) },
        isRead: false,
        isDeleted: false
      });
      conversation._unreadCount = unreadCount;
    }

    res.json({
      success: true,
      conversations
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare le conversazioni'
    });
  }
});

// Get or create conversation between two users
router.get('/conversations/:otherUserId', auth, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId;

    // Find existing conversation
    let conversation = await Conversation.findOne({
      $and: [
        { 'participants.user': currentUserId },
        { 'participants.user': otherUserId },
        { conversationType: 'direct' }
      ]
    }).populate('participants.user', 'name surname profileImageUrl role');

    if (!conversation) {
      // Create new conversation
      const User = require('../models/User');
      const [currentUser, otherUser] = await Promise.all([
        User.findById(currentUserId).select('role'),
        User.findById(otherUserId).select('role')
      ]);

      if (!otherUser) {
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }

      conversation = new Conversation({
        participants: [
          { user: currentUserId, role: currentUser.role },
          { user: otherUserId, role: otherUser.role }
        ],
        conversationType: 'direct'
      });

      await conversation.save();
      await conversation.populate('participants.user', 'name surname profileImageUrl role');
    }

    res.json({
      success: true,
      conversation
    });

  } catch (error) {
    console.error('Get/Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nella gestione della conversazione'
    });
  }
});

// Get messages between two users
router.get('/messages/:otherUserId', auth, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.getConversationMessages(
      req.user.userId,
      otherUserId,
      { page: parseInt(page), limit: parseInt(limit) }
    );

    // Mark messages as read
    await Message.updateMany({
      senderId: otherUserId,
      receiverId: req.user.userId,
      isRead: false
    }, {
      isRead: true,
      readAt: new Date()
    });

    res.json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare i messaggi'
    });
  }
});

// Send message
router.post('/messages', auth, async (req, res) => {
  try {
    const { receiverId, message, messageType = 'text', attachments, sharedContent, replyTo } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'ID destinatario richiesto'
      });
    }

    if (!message && (!attachments || attachments.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Messaggio o allegati richiesti'
      });
    }

    // Verify receiver exists
    const User = require('../models/User');
    const receiver = await User.findById(receiverId).select('name');
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Destinatario non trovato'
      });
    }

    // Create message
    const newMessage = new Message({
      senderId: req.user.userId,
      receiverId,
      message,
      messageType,
      attachments,
      sharedContent,
      replyTo,
      deliveredAt: new Date()
    });

    await newMessage.save();
    await newMessage.populate('senderId', 'name surname profileImageUrl');
    await newMessage.populate('receiverId', 'name surname profileImageUrl');

    // Update or create conversation
    let conversation = await Conversation.findOne({
      $and: [
        { 'participants.user': req.user.userId },
        { 'participants.user': receiverId },
        { conversationType: 'direct' }
      ]
    });

    if (!conversation) {
      const [sender, receiverUser] = await Promise.all([
        User.findById(req.user.userId).select('role'),
        User.findById(receiverId).select('role')
      ]);

      conversation = new Conversation({
        participants: [
          { user: req.user.userId, role: sender.role },
          { user: receiverId, role: receiverUser.role }
        ],
        conversationType: 'direct'
      });
    }

    await conversation.addMessage(newMessage._id);

    // Emit real-time message via Socket.IO
    if (req.app.locals.io) {
      req.app.locals.io.to(`user_${receiverId}`).emit('new_message', {
        message: newMessage,
        conversationId: conversation._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Messaggio inviato con successo',
      data: newMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'invio del messaggio'
    });
  }
});

// Edit message
router.put('/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;

    const messageDoc = await Message.findById(messageId);
    
    if (!messageDoc) {
      return res.status(404).json({
        success: false,
        message: 'Messaggio non trovato'
      });
    }

    // Verify sender ownership
    if (messageDoc.senderId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi modificare solo i tuoi messaggi'
      });
    }

    // Check if message is not too old (e.g., 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (messageDoc.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({
        success: false,
        message: 'Non puoi modificare messaggi più vecchi di 15 minuti'
      });
    }

    messageDoc.originalMessage = messageDoc.message;
    messageDoc.message = message;
    await messageDoc.save();

    // Emit update via Socket.IO
    if (req.app.locals.io) {
      req.app.locals.io.to(`user_${messageDoc.receiverId}`).emit('message_edited', {
        messageId,
        newMessage: message,
        isEdited: true
      });
    }

    res.json({
      success: true,
      message: 'Messaggio modificato con successo'
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la modifica del messaggio'
    });
  }
});

// Delete message
router.delete('/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Messaggio non trovato'
      });
    }

    // Verify sender ownership
    if (message.senderId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Puoi eliminare solo i tuoi messaggi'
      });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user.userId;
    await message.save();

    // Emit deletion via Socket.IO
    if (req.app.locals.io) {
      req.app.locals.io.to(`user_${message.receiverId}`).emit('message_deleted', {
        messageId
      });
    }

    res.json({
      success: true,
      message: 'Messaggio eliminato con successo'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione del messaggio'
    });
  }
});

// Add reaction to message
router.post('/messages/:messageId/reactions', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Messaggio non trovato'
      });
    }

    // Check if user already reacted
    const existingReaction = message.reactions.find(r => r.userId.toString() === req.user.userId);
    
    if (existingReaction) {
      if (existingReaction.reaction === reaction) {
        // Remove reaction
        message.reactions = message.reactions.filter(r => r.userId.toString() !== req.user.userId);
      } else {
        // Update reaction
        existingReaction.reaction = reaction;
        existingReaction.createdAt = new Date();
      }
    } else {
      // Add new reaction
      message.reactions.push({
        userId: req.user.userId,
        reaction,
        createdAt: new Date()
      });
    }

    await message.save();

    // Emit reaction via Socket.IO
    if (req.app.locals.io) {
      req.app.locals.io.to(`user_${message.receiverId}`).emit('message_reaction', {
        messageId,
        reactions: message.reactions
      });
    }

    res.json({
      success: true,
      message: 'Reazione aggiornata',
      reactions: message.reactions
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiunta della reazione'
    });
  }
});

// Mark conversation as read
router.put('/conversations/:conversationId/read', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversazione non trovata'
      });
    }

    // Verify user is participant
    const isParticipant = conversation.participants.some(p => p.user.toString() === req.user.userId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Non fai parte di questa conversazione'
      });
    }

    // Update last read timestamp
    await conversation.updateLastRead(req.user.userId);

    // Mark all messages in this conversation as read
    const otherParticipants = conversation.participants
      .filter(p => p.user.toString() !== req.user.userId)
      .map(p => p.user);

    await Message.updateMany({
      senderId: { $in: otherParticipants },
      receiverId: req.user.userId,
      isRead: false
    }, {
      isRead: true,
      readAt: new Date()
    });

    res.json({
      success: true,
      message: 'Conversazione segnata come letta'
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento'
    });
  }
});

// Search messages
router.get('/search', auth, async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query di ricerca deve essere di almeno 2 caratteri'
      });
    }

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { senderId: req.user.userId },
            { receiverId: req.user.userId }
          ]
        },
        {
          message: { $regex: query, $options: 'i' }
        },
        { isDeleted: false }
      ]
    })
    .populate('senderId', 'name surname')
    .populate('receiverId', 'name surname')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante la ricerca'
    });
  }
});

module.exports = router;