const Database = require('../config/database');
const jwt = require('jsonwebtoken');

const db = new Database();

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      throw new Error('Token richiesto');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    await db.connect();
    const user = await db.get(
      'SELECT id, email, name, surname, role, trainer_id FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );

    if (!user) {
      throw new Error('Utente non trovato');
    }

    socket.userId = user.id;
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Autenticazione fallita'));
  }
};

const chatSocket = (io, socket) => {
  // Authenticate socket connection
  socket.use(async (packet, next) => {
    if (!socket.userId) {
      await authenticateSocket(socket, next);
    } else {
      next();
    }
  });

  // Join user to their personal room
  socket.join(`user_${socket.userId}`);
  console.log(`User ${socket.userId} connected to chat`);

  // Handle joining conversation room
  socket.on('join_conversation', (otherUserId) => {
    // Verify user can chat with this person
    const roomId = [socket.userId, otherUserId].sort().join('_');
    socket.join(roomId);
    console.log(`User ${socket.userId} joined conversation with ${otherUserId}`);
  });

  // Handle leaving conversation room
  socket.on('leave_conversation', (otherUserId) => {
    const roomId = [socket.userId, otherUserId].sort().join('_');
    socket.leave(roomId);
    console.log(`User ${socket.userId} left conversation with ${otherUserId}`);
  });

  // Handle sending message
  socket.on('send_message', async (data) => {
    try {
      const { receiver_id, content, message_type = 'text', file_url } = data;

      await db.connect();

      // Verify user can send message to this person
      let canSend = false;
      
      if (socket.user.role === 'trainer') {
        // Trainer can send to their clients
        const client = await db.get(
          'SELECT id FROM users WHERE id = ? AND trainer_id = ? AND role = "client"',
          [receiver_id, socket.userId]
        );
        canSend = !!client;
      } else if (socket.user.role === 'client') {
        // Client can send to their trainer
        canSend = parseInt(receiver_id) === socket.user.trainer_id;
      }

      if (!canSend) {
        socket.emit('error', { message: 'Non autorizzato a inviare messaggi a questo utente' });
        return;
      }

      // Save message to database
      const result = await db.run(`
        INSERT INTO messages (sender_id, receiver_id, content, message_type, file_url)
        VALUES (?, ?, ?, ?, ?)
      `, [socket.userId, receiver_id, content, message_type, file_url || null]);

      // Get complete message data
      const message = await db.get(`
        SELECT m.*, 
               s.name as sender_name, s.surname as sender_surname,
               r.name as receiver_name, r.surname as receiver_surname
        FROM messages m
        JOIN users s ON m.sender_id = s.id
        JOIN users r ON m.receiver_id = r.id
        WHERE m.id = ?
      `, [result.id]);

      // Send to conversation room
      const roomId = [socket.userId, receiver_id].sort().join('_');
      io.to(roomId).emit('new_message', message);

      // Send to receiver's personal room (for notifications)
      io.to(`user_${receiver_id}`).emit('message_notification', {
        sender_id: socket.userId,
        sender_name: socket.user.name,
        content: content.length > 50 ? content.substring(0, 50) + '...' : content,
        created_at: message.created_at
      });

      // Confirm message sent
      socket.emit('message_sent', { message_id: result.id, status: 'delivered' });

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Errore nell\'invio del messaggio' });
    }
  });

  // Handle marking messages as read
  socket.on('mark_as_read', async (data) => {
    try {
      const { other_user_id } = data;

      await db.connect();

      await db.run(
        'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
        [other_user_id, socket.userId]
      );

      // Notify sender that messages were read
      io.to(`user_${other_user_id}`).emit('messages_read', {
        reader_id: socket.userId,
        reader_name: socket.user.name
      });

    } catch (error) {
      console.error('Mark as read error:', error);
    }
  });

  // Handle typing indicator
  socket.on('typing_start', (data) => {
    const { receiver_id } = data;
    socket.to(`user_${receiver_id}`).emit('user_typing', {
      user_id: socket.userId,
      user_name: socket.user.name
    });
  });

  socket.on('typing_stop', (data) => {
    const { receiver_id } = data;
    socket.to(`user_${receiver_id}`).emit('user_stopped_typing', {
      user_id: socket.userId
    });
  });

  // Handle user status
  socket.on('update_status', (status) => {
    socket.broadcast.emit('user_status_change', {
      user_id: socket.userId,
      status: status // 'online', 'away', 'busy', 'offline'
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected from chat`);
    
    // Notify others that user is offline
    socket.broadcast.emit('user_status_change', {
      user_id: socket.userId,
      status: 'offline'
    });
  });

  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
};

module.exports = chatSocket;