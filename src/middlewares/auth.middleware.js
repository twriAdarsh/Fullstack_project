import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import  jwt  from "jsonwebtoken";
import { User } from "../models/user.models.js";

export const verifyJWT= asyncHandler(async(req, _, next)=>{
   try {
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
     if(!token){
         return next(new ApiError(401, "Invalid Access Token"));
     }
     const decodedToken= jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user= await User.findById(decodedToken?._id).select('-password -refreshToken');
    if(!user){
        return new ApiError(401, "Invalid Access Token");
    }
    req.user = user;
    next();
   } catch (error) {
      throw new ApiError(401, error?.message || "Invalid Access Token");
   }

})