const { Message, Conversation } = require('../models/Chat');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Active users tracking
const activeUsers = new Map(); // userId -> socketId
const userSockets = new Map(); // socketId -> userId

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Token di autenticazione richiesto'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Utente non trovato o non attivo'));
    }

    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Token non valido'));
  }
};

// Main chat socket handler
const chatSocket = (io, socket) => {
  console.log(`🔌 User connected: ${socket.user.name} (${socket.userId})`);
  
  // Track active user
  activeUsers.set(socket.userId, socket.id);
  userSockets.set(socket.id, socket.userId);
  
  // Join user's personal room for notifications
  socket.join(`user_${socket.userId}`);
  
  // Emit user online status
  socket.broadcast.emit('user_online', {
    userId: socket.userId,
    name: socket.user.name,
    surname: socket.user.surname
  });

  // Handle joining conversation rooms
  socket.on('join_conversation', async (data) => {
    try {
      const { conversationId, otherUserId } = data;
      
      if (conversationId) {
        // Join specific conversation room
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          const isParticipant = conversation.participants.some(p => 
            p.user.toString() === socket.userId
          );
          
          if (isParticipant) {
            socket.join(`conversation_${conversationId}`);
            socket.emit('joined_conversation', { conversationId });
          }
        }
      } else if (otherUserId) {
        // Join or create direct conversation room
        const roomId = [socket.userId, otherUserId].sort().join('_');
        socket.join(`direct_${roomId}`);
        socket.emit('joined_conversation', { roomId: `direct_${roomId}` });
      }
    } catch (error) {
      console.error('Join conversation error:', error);
      socket.emit('error', { message: 'Errore nell\'entrare nella conversazione' });
    }
  });

  // Handle leaving conversation rooms
  socket.on('leave_conversation', (data) => {
    const { conversationId, otherUserId } = data;
    
    if (conversationId) {
      socket.leave(`conversation_${conversationId}`);
    } else if (otherUserId) {
      const roomId = [socket.userId, otherUserId].sort().join('_');
      socket.leave(`direct_${roomId}`);
    }
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { receiverId, message, messageType = 'text', attachments, sharedContent, replyTo } = data;

      if (!receiverId || (!message && (!attachments || attachments.length === 0))) {
        return socket.emit('message_error', { 
          error: 'Destinatario e messaggio sono richiesti' 
        });
      }

      // Verify receiver exists
      const receiver = await User.findById(receiverId).select('name surname');
      if (!receiver) {
        return socket.emit('message_error', { 
          error: 'Destinatario non trovato' 
        });
      }

      // Create message
      const newMessage = new Message({
        senderId: socket.userId,
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
          { 'participants.user': socket.userId },
          { 'participants.user': receiverId },
          { conversationType: 'direct' }
        ]
      });

      if (!conversation) {
        const sender = await User.findById(socket.userId).select('role');
        const receiverUser = await User.findById(receiverId).select('role');

        conversation = new Conversation({
          participants: [
            { user: socket.userId, role: sender.role },
            { user: receiverId, role: receiverUser.role }
          ],
          conversationType: 'direct'
        });
      }

      await conversation.addMessage(newMessage._id);

      // Emit to receiver's room
      io.to(`user_${receiverId}`).emit('new_message', {
        message: newMessage,
        conversationId: conversation._id
      });

      // Emit back to sender for confirmation
      socket.emit('message_sent', {
        message: newMessage,
        conversationId: conversation._id
      });

      // Send to conversation room if exists
      const roomId = [socket.userId, receiverId].sort().join('_');
      io.to(`direct_${roomId}`).emit('message_broadcast', {
        message: newMessage
      });

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', { 
        error: 'Errore durante l\'invio del messaggio' 
      });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { receiverId, conversationId } = data;
    
    if (receiverId) {
      socket.to(`user_${receiverId}`).emit('user_typing', {
        userId: socket.userId,
        name: socket.user.name,
        isTyping: true
      });
    }
    
    if (conversationId) {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        name: socket.user.name,
        isTyping: true
      });
    }
  });

  socket.on('typing_stop', (data) => {
    const { receiverId, conversationId } = data;
    
    if (receiverId) {
      socket.to(`user_${receiverId}`).emit('user_typing', {
        userId: socket.userId,
        name: socket.user.name,
        isTyping: false
      });
    }
    
    if (conversationId) {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        name: socket.user.name,
        isTyping: false
      });
    }
  });

  // Handle message reactions
  socket.on('add_reaction', async (data) => {
    try {
      const { messageId, reaction } = data;
      
      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('reaction_error', { error: 'Messaggio non trovato' });
      }

      // Check if user already reacted
      const existingReaction = message.reactions.find(r => 
        r.userId.toString() === socket.userId
      );
      
      if (existingReaction) {
        if (existingReaction.reaction === reaction) {
          // Remove reaction
          message.reactions = message.reactions.filter(r => 
            r.userId.toString() !== socket.userId
          );
        } else {
          // Update reaction
          existingReaction.reaction = reaction;
          existingReaction.createdAt = new Date();
        }
      } else {
        // Add new reaction
        message.reactions.push({
          userId: socket.userId,
          reaction,
          createdAt: new Date()
        });
      }

      await message.save();

      // Emit to both users
      io.to(`user_${message.senderId}`).to(`user_${message.receiverId}`).emit('message_reaction', {
        messageId,
        reactions: message.reactions,
        updatedBy: socket.userId
      });

    } catch (error) {
      console.error('Add reaction error:', error);
      socket.emit('reaction_error', { error: 'Errore durante l\'aggiunta della reazione' });
    }
  });

  // Handle message read status
  socket.on('mark_as_read', async (data) => {
    try {
      const { messageId, conversationId } = data;

      if (messageId) {
        // Mark specific message as read
        const message = await Message.findById(messageId);
        if (message && message.receiverId.toString() === socket.userId) {
          await message.markAsRead(socket.userId);
          
          // Notify sender
          io.to(`user_${message.senderId}`).emit('message_read', {
            messageId,
            readBy: socket.userId,
            readAt: new Date()
          });
        }
      } else if (conversationId) {
        // Mark all messages in conversation as read
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          const otherParticipants = conversation.participants
            .filter(p => p.user.toString() !== socket.userId)
            .map(p => p.user);

          await Message.updateMany({
            senderId: { $in: otherParticipants },
            receiverId: socket.userId,
            isRead: false
          }, {
            isRead: true,
            readAt: new Date()
          });

          await conversation.updateLastRead(socket.userId);

          // Notify other participants
          otherParticipants.forEach(participantId => {
            io.to(`user_${participantId}`).emit('conversation_read', {
              conversationId,
              readBy: socket.userId
            });
          });
        }
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  });

  // Handle message editing
  socket.on('edit_message', async (data) => {
    try {
      const { messageId, newMessage } = data;
      
      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('edit_error', { error: 'Messaggio non trovato' });
      }

      if (message.senderId.toString() !== socket.userId) {
        return socket.emit('edit_error', { error: 'Puoi modificare solo i tuoi messaggi' });
      }

      // Check if message is not too old (15 minutes)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (message.createdAt < fifteenMinutesAgo) {
        return socket.emit('edit_error', { 
          error: 'Non puoi modificare messaggi più vecchi di 15 minuti' 
        });
      }

      message.originalMessage = message.message;
      message.message = newMessage;
      await message.save();

      // Emit update to both users
      io.to(`user_${message.senderId}`).to(`user_${message.receiverId}`).emit('message_edited', {
        messageId,
        newMessage,
        editedAt: new Date(),
        editedBy: socket.userId
      });

    } catch (error) {
      console.error('Edit message error:', error);
      socket.emit('edit_error', { error: 'Errore durante la modifica del messaggio' });
    }
  });

  // Handle message deletion
  socket.on('delete_message', async (data) => {
    try {
      const { messageId } = data;
      
      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('delete_error', { error: 'Messaggio non trovato' });
      }

      if (message.senderId.toString() !== socket.userId) {
        return socket.emit('delete_error', { error: 'Puoi eliminare solo i tuoi messaggi' });
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.deletedBy = socket.userId;
      await message.save();

      // Emit deletion to both users
      io.to(`user_${message.senderId}`).to(`user_${message.receiverId}`).emit('message_deleted', {
        messageId,
        deletedBy: socket.userId,
        deletedAt: new Date()
      });

    } catch (error) {
      console.error('Delete message error:', error);
      socket.emit('delete_error', { error: 'Errore durante l\'eliminazione del messaggio' });
    }
  });

  // Handle getting online users
  socket.on('get_online_users', () => {
    const onlineUsers = Array.from(activeUsers.keys()).map(userId => {
      const user = userSockets.get(activeUsers.get(userId));
      return {
        userId,
        socketId: activeUsers.get(userId)
      };
    });

    socket.emit('online_users', onlineUsers);
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${socket.user?.name} (${socket.userId}) - ${reason}`);
    
    // Remove from active users
    activeUsers.delete(socket.userId);
    userSockets.delete(socket.id);
    
    // Update last activity
    if (socket.userId) {
      User.findByIdAndUpdate(socket.userId, {
        lastActivity: new Date()
      }).exec().catch(console.error);
    }
    
    // Emit user offline status
    socket.broadcast.emit('user_offline', {
      userId: socket.userId,
      name: socket.user?.name,
      surname: socket.user?.surname
    });
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`Socket error for user ${socket.userId}:`, error);
  });
};

// Initialize chat socket with authentication
const initChatSocket = (io) => {
  // Add authentication middleware
  io.use(authenticateSocket);
  
  // Handle connections
  io.on('connection', (socket) => {
    chatSocket(io, socket);
  });
  
  return io;
};

module.exports = initChatSocket;