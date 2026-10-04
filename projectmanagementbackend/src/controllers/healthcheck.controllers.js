import { ApiResponse } from '#utils/ApiResponse.js';
import { asyncHandler } from '#utils/asyncHandler.js';

/**
const healthCheck = async (req, res, next) => {
    try {
        const user = getUserFromDB()
        new ApiResponse(201, { message: "server is Running!! " },)
    } catch (error) {
        next(error)
    }
}
 */

const healthCheck = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: 'Server is Running ' }));
});

export { healthCheck };
