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

    // Defaults are in code (not only in .ENV.SAMPLE): on Render there is no
    // .env file, so unset ADMIN_* would make User.create fail validation.
    const username = process.env.ADMIN_USERNAME || 'admin';
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    await User.create({
      username,
      email,
      password,
      role: UserRoleEnum.ADMIN,
    });

    console.log('✅ Default admin created');
  } catch (error) {
    console.log('❌ Admin bootstrap failed', error);
  }
};