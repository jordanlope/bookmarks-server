require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const { v4: uuid } = require('uuid')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const { bookmarks } = require('./store')
const logger = require('./logger')

const app = express()

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())
app.use(express.json())

app.use(function validateBearerToken(req, res, next) {
    const apiToken = process.env.API_TOKEN

    const authToken = req.get('Authorization')

    console.log(authToken, apiToken)
    if (!authToken || authToken.split(' ')[1] !== apiToken) {
        logger.error(`Unauthorized request to path: ${req.path}`);
        return res.status(401).json({ error: 'Unauthorized request' })
    }
    // move to the next middleware
    next()
})

app.use(function errorHandler(error, req, res, next) {
    let response
    if (NODE_ENV === 'production') {
        response = { error: { message: 'server error' } }
    } else {
        console.error(error)
        response = { message: error.message, error }
    }
    res.status(500).json(response)
})


app.get('/bookmarks', (req, res) => {
    res.json(bookmarks)
})


app.post('/bookmarks', (req, res) => {
    const { title, url, description, rating = 0 } = req.body;

    if(!title) {
        logger.error(`Title is required`);
        return res
        .status(400)
        .send('Invalid data');
    }

    if(!url) {
        logger.error('URL is required');
        return res
        .status(400)
        .send('Invalid data');
    }

    if(!description) {
        logger.error('Description is required');
        return res
        .status(400)
        .send('Invalid data');
    }

    // get id
    const id = uuid();

    const bookmark = {
        id,
        title,
        url,
        description,
        rating
    }

    bookmarks.push(bookmark);

    logger.info(`Bookmark with ${id}`)

    res
        .status(201)
        .location(`http://localhost:8000/bookmark/${id}`)
        .json(bookmark)

})

app.get('/bookmark/:id', (req, res) => {
    const { id } = req.params;
    const bookmark = bookmarks.find(b => b.id == id)
 
    if (!bookmark) {
        logger.error(`Bookmark not found at ${id}`);
        return res
            .status(404)
            .send('Bookmark not found')
    }

    res.json(bookmark)

})

app.delete('/bookmark/:id', (req, res) => {
    const {id} = req.params;
    const bookmarkIndex = bookmarks.findIndex(b => b.id == id);

    if (bookmarkIndex === -1) {
        logger.error(`Bookmark not found at ${id}`);
        return res
            .status(404)
            .send('Bookmark not found')
    }

    bookmarks.splice(bookmarkIndex, 1)

    logger.info(`Bookmark with id ${id} deleted.`);

    res
        .status(204)
        .end();
})

module.exports = app
