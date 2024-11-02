const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()
const dbPath = path.join(__dirname, 'goodreads.db')

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

let db = null

// Database connection create

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

//Verified jwt token

const authentication = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_KEY', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

//Register User

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const getUserQuery = `SELECT * FROM user WHERE username = "${username}";`
  console.log(username, password, name, gender)

  const getDBDetails = await db.get(getUserQuery)

  if (getDBDetails !== undefined) {
    response.status(400)
    response.send('User already exists')
  } else {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const hashedPassword = await bcrypt.hash(password, 10)
      const createUserQuery = `INSERT INTO user(name, username, password, gender)
      VALUES ("${name}", "${username}","${hashedPassword}", "${gender}");`
      await db.run(createUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  }
})

//Login User

app.post('/login/', async (request, response) => {
  const {username, password} = request.body

  const getUserQuery = `SELECT * FROM user WHERE username = "${username}";`

  console.log(username, password)

  const userDbDetails = await db.get(getUserQuery)

  if (userDbDetails !== undefined) {
    const isPasswordCorrect = await bcrypt.compare(
      password,

      userDbDetails.password,
    )

    if (isPasswordCorrect === true) {
      const jwtToken = jwt.sign(userDbDetails, 'MY_SECRET_KEY')

      response.send({jwtToken})
    } else {
      response.status(400)

      response.send('Invalid password')
    }
  } else {
    response.status(400)

    response.send('Invalid user')
  }
})

//Get User Profile API with Authenticate Token Middleware

app.get('/profile/', authenticateToken, async (request, response) => {
  let {username} = request
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const userDetails = await db.get(selectUserQuery)
  response.send(userDetails)
})

//Get All Books API

app.get('/books/', authentication, async (request, response) => {
  const getBooksQuery = `

    SELECT

      *

    FROM

      book

    ORDER BY

      book_id;`

  const booksArray = await db.all(getBooksQuery)

  response.send(booksArray)
})

//Get Book API

app.get('/books/:bookId/', authentication, async (request, response) => {
  const {bookId} = request.params

  const getBookQuery = `

    SELECT

      *

    FROM

      book

    WHERE

      book_id = ${bookId};`

  const book = await db.get(getBookQuery)

  response.send(book)
})

//Add Book API

app.post('/books/', authentication, async (request, response) => {
  const {
    title,

    authorId,

    rating,

    ratingCount,

    reviewCount,

    description,

    pages,

    dateOfPublication,

    editionLanguage,

    price,

    onlineStores,
  } = request.body

  const addBookQuery = `

    INSERT INTO

      book (title,author_id,rating,rating_count,review_count,description,pages,date_of_publication,edition_language,price,online_stores)

    VALUES

      (

        '${title}',

         ${authorId},

         ${rating},

         ${ratingCount},

         ${reviewCount},

        '${description}',

         ${pages},

        '${dateOfPublication}',

        '${editionLanguage}',

         ${price},

        '${onlineStores}'

      );`

  const dbResponse = await db.run(addBookQuery)

  const bookId = dbResponse.lastID

  response.send({bookId: bookId})
})

//Update Book API

app.put('/books/:bookId/', authentication, async (request, response) => {
  const {bookId} = request.params

  const {
    title,

    authorId,

    rating,

    ratingCount,

    reviewCount,

    description,

    pages,

    dateOfPublication,

    editionLanguage,

    price,

    onlineStores,
  } = request.body

  const updateBookQuery = `

    UPDATE

      book

    SET

      title='${title}',

      author_id=${authorId},

      rating=${rating},

      rating_count=${ratingCount},

      review_count=${reviewCount},

      description='${description}',

      pages=${pages},

      date_of_publication='${dateOfPublication}',

      edition_language='${editionLanguage}',

      price=${price},

      online_stores='${onlineStores}'

    WHERE

      book_id = ${bookId};`

  await db.run(updateBookQuery)

  response.send('Book Updated Successfully')
})

//Delete Book API

app.delete('/books/:bookId/', authentication, async (request, response) => {
  const {bookId} = request.params

  const deleteBookQuery = `

    DELETE FROM

      book

    WHERE

      book_id = ${bookId};`

  await db.run(deleteBookQuery)

  response.send('Book Deleted Successfully')
})

//Get Authors Book API

app.get(
  '/authors/:authorId/books/',
  authentication,
  async (request, response) => {
    const {authorId} = request.params

    const getAuthorBooksQuery = `

    SELECT

     *

    FROM

     book

    WHERE

      author_id = ${authorId};`

    const booksArray = await db.all(getAuthorBooksQuery)

    response.send(booksArray)
  },
)
