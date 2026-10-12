import mongoose, { Schema } from 'mongoose';
import {
  AvailableUserRole,
  UserRoleEnum,
} from '#utils/constants.js';


import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema(
  {
    avatar: {
      url: {
        type: String,
        default: 'https://placehold.co/150x150',
      },

      localPath: {
        type: String,
        default: '',
      },
    },

    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      minlength: 3,
      maxlength: 30,
      match: [
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers and underscore',
      ],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid email address',
      ],
    },

    fullName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: AvailableUserRole,
      default: UserRoleEnum.MEMBER,
    },

    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

/* =========================================================
   HASH PASSWORD
========================================================= */

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return ;
  }

  this.password = await bcrypt.hash(
    this.password,
    Number(process.env.BCRYPT_SALT_ROUNDS) || 10
  );

});

/* =========================================================
   PASSWORD CHECK
========================================================= */

userSchema.methods.isPasswordCorrect =
  async function (password) {
    return await bcrypt.compare(
      password,
      this.password
    );
  };

/* =========================================================
   ACCESS TOKEN
========================================================= */

userSchema.methods.generateAccessToken =
  function () {
    return jwt.sign(
      {
        _id: this._id,
        email: this.email,
        username: this.username,
      },

      process.env.ACCESS_TOKEN_SECRET,

      {
        // Fallbacks matter: on Render there is no .env file, and an
        // `expiresIn: undefined` makes jsonwebtoken throw (login → 500).
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d',
      }
    );
  };

/* =========================================================
   REFRESH TOKEN
========================================================= */

userSchema.methods.generateRefreshToken =
  function () {
    return jwt.sign(
      {
        _id: this._id,
      },

      process.env.REFRESH_TOKEN_SECRET,

      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d',
      }
    );
  };

export const User = mongoose.model(
  'User',
  userSchema
);