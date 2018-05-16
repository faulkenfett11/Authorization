const jwt = require('jsonwebtoken');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');

const User = require('../users/User');
const secret = 'what is going on with this project';

const localStrategy = new LocalStrategy(function(username, password, done) {
	User
		.findOne({ username })
    .then(user => {
      if (!user) {
        done(null, false);
      } else {
        user
          .validatePassword(password)
          .then(isValid => {
            if (isValid) {
              const { _id, username } = user;
              return done(null, { _id, username });
            } else {
              return done(null, false);
            }
          })
          .catch(err => {
            return done(err);
          });
      }
    })
		.catch(err => 
			done(err));
});

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: secret,
};

const jwtStrategy = new JwtStrategy(jwtOptions, function(payload, done) {
	User
		.findById(payload.sub)
    .then(user => {
      if (user) {
        done(null, user);
      } else {
        done(null, false);
      }
    })
    .catch(err => {
      done(err);
    });
});

passport.use(localStrategy);
passport.use(jwtStrategy);

const passportOptions = { session: false };
const authenticate = passport.authenticate('local', passportOptions);
const protected = passport.authenticate('jwt', passportOptions);

function makeToken(user) {
  const timestamp = new Date().getTime();
  const payload = {
    sub: user._id,
    iat: timestamp,
    username: user.username,
  };
  const options = {
    expiresIn: '24h',
  };

  return jwt.sign(payload, secret, options);
}

module.exports = function(server) {
	server
		.get('/', function(req, res) {
    res.send({ api: 'up and running' });
  });

  server.post('/register', function(req, res) {
		User
			.create(req.body)
      .then(user => {
        const token = makeToken(user);
        res.status(201).json({ user, token });
      })
			.catch(err => 
				res.status(500).json(err));
  });

  server.post('/login', authenticate, (req, res) => {
    res.status(200).json({ token: makeToken(req.user), user: req.user });
  });

  server.get('/users', protected, (req, res) => {
		User
			.find()
      .select('username')
      .then(users => {
        res.json(users);
      })
      .catch(err => {
        res.status(500).json(err);
      });
  });
};