/*
 * API sub-router for photos collection endpoints.
 */

const { Router } = require('express')
const crypto = require('crypto')

const { validateAgainstSchema } = require('../lib/validation')
const {
  PhotoSchema,
  insertNewPhoto,
  getPhotoById
} = require('../models/photo')

const router = Router()
const multer = require('multer');
const imageTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png'
};
const upload = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}/uploads`,
    filename: (req, file, callback) => {
      const filename =
        crypto.pseudoRandomBytes(16).toString('hex');
      const extension = imageTypes[file.mimetype];
      callback(null, `${filename}.${extension}`);
    }
  }),
  fileFilter: (req, file, callback) => {
    callback(null, !!imageTypes[file.mimetype]);
  }
});


/*
 * POST /photos - Route to create a new photo.
 */
router.post('/', upload.single('image'), async (req, res, next) => {
  if (req.file && validateAgainstSchema(req.body, PhotoSchema)) {
    try {
      const photo = {
        contentType: req.file.mimetype,
        filename: req.file.filename,
        path: req.file.path,
        businessId: req.body.businessId
      };
      const id = await insertNewPhoto(photo)
      res.status(201).send({
        id: id,
        links: {
          photo: `/photos/${id}`,
          business: `/businesses/${req.body.businessId}`
        }
      })
    } catch (err) {
      console.error(err)
      res.status(500).send({
        error: "Error inserting photo into DB.  Please try again later."
      })
    }
  } else {
    res.status(400).send({
      error: "Request body is not a valid photo object"
    })
  }
})

/*
 * GET /photos/{id} - Route to fetch info about a specific photo.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const photo = await getPhotoById(req.params.id)
    if (photo) {
      delete photo.path;
      photo.url = `/media/images/${photo.filename}`;
      res.status(200).send(photo)
    } else {
      next()
    }
  } catch (err) {
    console.error(err)
    res.status(500).send({
      error: "Unable to fetch photo.  Please try again later."
    })
  }
})

module.exports = router
