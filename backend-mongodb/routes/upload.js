const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { auth } = require('../middleware/auth');
const sharp = require('sharp');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadType = req.params.type || 'general';
    const uploadPath = path.join(__dirname, '..', 'uploads', uploadType);
    
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${req.user.userId}-${uniqueSuffix}${extension}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const uploadType = req.params.type;
  
  switch (uploadType) {
    case 'profiles':
    case 'progress':
      // Images only
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Solo file immagine sono permessi'), false);
      }
      break;
    case 'videos':
      // Videos only
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Solo file video sono permessi'), false);
      }
      break;
    case 'documents':
      // Documents
      if (file.mimetype.includes('pdf') || file.mimetype.includes('document')) {
        cb(null, true);
      } else {
        cb(new Error('Solo documenti PDF o Word sono permessi'), false);
      }
      break;
    default:
      // General files
      cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Max 10 files at once
  }
});

// Single file upload
router.post('/:type', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nessun file caricato'
      });
    }

    const { type } = req.params;
    const file = req.file;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    let processedFile = {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `${baseUrl}/uploads/${type}/${file.filename}`
    };

    // Process images
    if (file.mimetype.startsWith('image/')) {
      try {
        // Create thumbnail for images
        const thumbnailPath = path.join(file.destination, `thumb_${file.filename}`);
        
        await sharp(file.path)
          .resize(300, 300, { 
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);

        processedFile.thumbnailUrl = `${baseUrl}/uploads/${type}/thumb_${file.filename}`;

        // For progress photos, also create a medium size
        if (type === 'progress') {
          const mediumPath = path.join(file.destination, `medium_${file.filename}`);
          
          await sharp(file.path)
            .resize(800, 800, { 
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toFile(mediumPath);

          processedFile.mediumUrl = `${baseUrl}/uploads/${type}/medium_${file.filename}`;
        }

        // Get image metadata
        const metadata = await sharp(file.path).metadata();
        processedFile.dimensions = {
          width: metadata.width,
          height: metadata.height
        };

      } catch (imageError) {
        console.error('Image processing error:', imageError);
        // Continue without image processing if it fails
      }
    }

    // Log upload for analytics
    console.log(`File uploaded: ${file.filename} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      message: 'File caricato con successo',
      file: processedFile
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il caricamento del file'
    });
  }
});

// Multiple files upload
router.post('/:type/multiple', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nessun file caricato'
      });
    }

    const { type } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const processedFiles = [];

    for (const file of req.files) {
      let processedFile = {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `${baseUrl}/uploads/${type}/${file.filename}`
      };

      // Process images
      if (file.mimetype.startsWith('image/')) {
        try {
          // Create thumbnail
          const thumbnailPath = path.join(file.destination, `thumb_${file.filename}`);
          
          await sharp(file.path)
            .resize(300, 300, { 
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality: 80 })
            .toFile(thumbnailPath);

          processedFile.thumbnailUrl = `${baseUrl}/uploads/${type}/thumb_${file.filename}`;

          // Get image metadata
          const metadata = await sharp(file.path).metadata();
          processedFile.dimensions = {
            width: metadata.width,
            height: metadata.height
          };

        } catch (imageError) {
          console.error('Image processing error:', imageError);
        }
      }

      processedFiles.push(processedFile);
    }

    res.status(201).json({
      success: true,
      message: `${processedFiles.length} file caricati con successo`,
      files: processedFiles
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il caricamento dei file'
    });
  }
});

// Delete file
router.delete('/:type/:filename', auth, async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    // Verify the file belongs to the user (basic security)
    if (!filename.startsWith(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Non autorizzato a eliminare questo file'
      });
    }

    const filePath = path.join(__dirname, '..', 'uploads', type, filename);
    const thumbnailPath = path.join(__dirname, '..', 'uploads', type, `thumb_${filename}`);
    const mediumPath = path.join(__dirname, '..', 'uploads', type, `medium_${filename}`);

    try {
      // Delete main file
      await fs.unlink(filePath);
      
      // Delete thumbnail if exists
      try {
        await fs.unlink(thumbnailPath);
      } catch (e) {
        // Thumbnail might not exist, ignore error
      }
      
      // Delete medium size if exists
      try {
        await fs.unlink(mediumPath);
      } catch (e) {
        // Medium size might not exist, ignore error
      }

      res.json({
        success: true,
        message: 'File eliminato con successo'
      });

    } catch (deleteError) {
      if (deleteError.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          message: 'File non trovato'
        });
      }
      throw deleteError;
    }

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione del file'
    });
  }
});

// Get file info
router.get('/:type/:filename/info', auth, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const filePath = path.join(__dirname, '..', 'uploads', type, filename);

    try {
      const stats = await fs.stat(filePath);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const fileInfo = {
        filename,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        url: `${baseUrl}/uploads/${type}/${filename}`
      };

      // Add thumbnail URL if exists
      const thumbnailPath = path.join(__dirname, '..', 'uploads', type, `thumb_${filename}`);
      try {
        await fs.stat(thumbnailPath);
        fileInfo.thumbnailUrl = `${baseUrl}/uploads/${type}/thumb_${filename}`;
      } catch (e) {
        // Thumbnail doesn't exist
      }

      res.json({
        success: true,
        file: fileInfo
      });

    } catch (statError) {
      if (statError.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          message: 'File non trovato'
        });
      }
      throw statError;
    }

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare le informazioni del file'
    });
  }
});

// List user files
router.get('/:type/list', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const uploadsPath = path.join(__dirname, '..', 'uploads', type);
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    try {
      const files = await fs.readdir(uploadsPath);
      
      // Filter files belonging to the user
      const userFiles = files.filter(file => 
        file.startsWith(req.user.userId) && 
        !file.startsWith('thumb_') && 
        !file.startsWith('medium_')
      );

      // Pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedFiles = userFiles.slice(startIndex, endIndex);

      // Get file details
      const fileDetails = await Promise.all(
        paginatedFiles.map(async (filename) => {
          try {
            const filePath = path.join(uploadsPath, filename);
            const stats = await fs.stat(filePath);
            
            const fileInfo = {
              filename,
              size: stats.size,
              createdAt: stats.birthtime,
              url: `${baseUrl}/uploads/${type}/${filename}`
            };

            // Check for thumbnail
            const thumbnailPath = path.join(uploadsPath, `thumb_${filename}`);
            try {
              await fs.stat(thumbnailPath);
              fileInfo.thumbnailUrl = `${baseUrl}/uploads/${type}/thumb_${filename}`;
            } catch (e) {
              // No thumbnail
            }

            return fileInfo;
          } catch (e) {
            return null;
          }
        })
      );

      const validFiles = fileDetails.filter(file => file !== null);

      res.json({
        success: true,
        files: validFiles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: userFiles.length,
          pages: Math.ceil(userFiles.length / parseInt(limit))
        }
      });

    } catch (readdirError) {
      if (readdirError.code === 'ENOENT') {
        return res.json({
          success: true,
          files: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
      throw readdirError;
    }

  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recuperare la lista dei file'
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File troppo grande. Massimo 50MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Troppi file. Massimo 10 file alla volta'
      });
    }
  }
  
  if (error.message.includes('Solo file')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

module.exports = router;