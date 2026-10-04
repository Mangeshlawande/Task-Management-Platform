import { User } from '#models/user.models.js';
import { UserRoleEnum } from '#utils/constants.js';

export const createAdminIfNotExists = async () => {
  try {
    const adminExists = await User.findOne({
      role: UserRoleEnum.ADMIN,
    });

    if (adminExists) {
      console.log('✅ Admin already exists');
      return;
    }

    await User.create({
      username: process.env.ADMIN_USERNAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: UserRoleEnum.ADMIN,
      // Bootstrap account owns the system — never leave it locked behind OTP.
      isEmailVerified: true,
    });

    console.log('✅ Default admin created');
  } catch (error) {
    console.log('❌ Admin bootstrap failed', error);
  }
};