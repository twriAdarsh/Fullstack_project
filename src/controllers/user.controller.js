
import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.models.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const  generateAccessandRefreshTokens= async (userId)=>{
    try {
     const userDoc = await User.findById(userId); // Changed variable name to avoid confusion
     if (!userDoc) {
       throw new ApiError(404, "User not found");
     }
     const accessToken = userDoc.generateAccessToken();
     const refreshToken = userDoc.generateRefreshToken();

     userDoc.refreshToken = refreshToken;
     await userDoc.save({ validateBeforeSave: false });

     return { accessToken, refreshToken };

   } catch (error) {
     throw new ApiError(500, "Something went wrong while generating refresh and access tokens")
   }

}

const registerUser= asyncHandler(async (req, res) => {
  // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response
    const {fullName, email, username, password} = req.body;
    if([fullName, email, username, password].some(field => field?.trim() === '')){
      throw new ApiError(400, 'All fields are required');
    }
    const existedUser = await User.findOne({
      $or:[{ username }, { email}]
    })

    if(existedUser){
      throw new ApiError(409, 'User already exists');
    }
    const avatarLocalPath=req.files?.avatar[0]?.path;
   // const coverImageLocalPath=req.files?.coverImage[0]?.path;
    let coverImageLocalPath
    if(req.files?.coverImage && req.files?.coverImage.length>0){
       coverImageLocalPath=req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
      throw new ApiError(400, 'avatar is required');
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar){
      throw new ApiError(400, 'avatar is required');
    }
   const user= await  User.create({
      fullName,
      email,
      password,
      username:username.toLowerCase(),
      avatar : avatar.url,
      coverImage : coverImage.url || "",
    });

    const createdUser= await User.findById(user._id).select('-password -refreshToken');
    if(!createdUser){
      throw new ApiError(500, 'Something went wrong while registering user');
    }

    return res.status(201).json(new ApiResponse(200, createdUser, 'User registered successfully'));

});

const loginUser = asyncHandler(async (req, res) => 
  {
    // req body->data
    // username or email
    //find the user
    //password check
    //access and  refresh token
    //send cookies


    const {email, username , password} = req.body;
    if(!username && !email){
      throw new ApiError(400, 'Username or email is required');
    }
    const user= await User.findOne({
       $or:[{email},{username}]
    })
    if(!user){
      throw new ApiError(404, 'User not found');
    }

    const isPasswordValid= await user.isPasswordCorrect(password);
    if(!isPasswordValid){
      throw new ApiError(401, 'Invalid password');
    }

    const {accessToken,refreshToken}=await generateAccessandRefreshTokens(user._id);
    const loggedInUser= await User.findById(user._id).select('-password -refreshToken');


    const options ={
      httpOnly:true,
      secure :true
    }

    return res
    .status(200)
    .cookie('refreshToken', refreshToken, options)
    .cookie('accessToken', accessToken, options)
    .json(
       new ApiResponse(
          200,
          {
            user: loggedInUser,
            accessToken,
            refreshToken
          },
          "User Logged In Successfully"
       )
    )

     
  })

const logoutUser= asyncHandler(async (req, res) => {
     await  User.findByIdAndUpdate(
        req.user._id,
        {
          $set: { 
              refreshToken:undefined
          }
        },
          {
            new:true
          }
      )

      
    const options ={
      httpOnly:true,
      secure :true
    }

    return res
    .status(200)
    .clearCookie('refreshToken', null, options)
    .clearCookie('accessToken', null, options)
    .json(
       new ApiResponse(
          200,
          null,
          "User Logged Out Successfully"
       )
    )

})
export { registerUser, loginUser, logoutUser } 