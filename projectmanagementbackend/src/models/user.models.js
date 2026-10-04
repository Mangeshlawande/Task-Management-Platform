import mongoose, { Schema } from 'mongoose';
import {
  AvailableUserRole,
  UserRoleEnum,
  EmailOtpPolicy,
} from '#utils/constants.js';


import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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

    forgotPasswordToken: String,

    forgotPasswordExpiry: Date,

    /* --- Email verification (OTP) --------------------------------------
       `isEmailVerified` deliberately has NO default: accounts created
       before OTP verification existed have no stored value and are treated
       as verified (see `loginUser`), so nobody is locked out. New sign-ups
       set it to `false` explicitly. */
    isEmailVerified: Boolean,

    // Only the sha256 hash of the code is stored — never the code itself.
    emailVerificationOtp: {
      type: String,
      select: false,
    },

    emailVerificationOtpExpiry: {
      type: Date,
      select: false,
    },

    emailVerificationOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    // Enforces the resend cooldown without an extra round-trip to the mailer.
    emailVerificationOtpSentAt: {
      type: Date,
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
        expiresIn:
          process.env.ACCESS_TOKEN_EXPIRY,
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
        expiresIn:
          process.env.REFRESH_TOKEN_EXPIRY,
      }
    );
  };

/* =========================================================
   GENERATE SECURE TEMP TOKEN
========================================================= */

userSchema.methods.generateTemporaryToken =
  function () {
    const unHashedToken = crypto
      .randomBytes(20)
      .toString('hex');

    const hashedToken = crypto
      .createHash('sha256')
      .update(unHashedToken)
      .digest('hex');

    const tokenExpiry =
      Date.now() + 20 * 60 * 1000;

    return {
      unHashedToken,
      hashedToken,
      tokenExpiry,
    };
  };

/* =========================================================
   EMAIL VERIFICATION OTP
========================================================= */

userSchema.methods.generateEmailVerificationOtp =
  function () {
    const { codeLength } = EmailOtpPolicy;

    // crypto.randomInt is CSPRNG-backed (Math.random must never be used for
    // a value a user could guess).
    const otp = crypto
      .randomInt(10 ** (codeLength - 1), 10 ** codeLength)
      .toString();

    this.emailVerificationOtp = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    this.emailVerificationOtpExpiry = new Date(
      Date.now() + EmailOtpPolicy.ttlMs
    );
    this.emailVerificationOtpAttempts = 0;
    this.emailVerificationOtpSentAt = new Date();

    // Returned exactly once so the caller can email it — never persisted.
    return otp;
  };

userSchema.methods.isEmailVerificationOtpValid =
  function (otp) {
    if (!this.emailVerificationOtp) {
      return false;
    }

    const hashed = crypto
      .createHash('sha256')
      .update(String(otp))
      .digest('hex');

    return hashed === this.emailVerificationOtp;
  };

export const User = mongoose.model(
  'User',
  userSchema
);