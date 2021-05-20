/* eslint-disable */
// check is Empty
const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

//check is Email
const isEmail = (email) => {
  const regEx = /^[a-zA-Z0-9]+([-._][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([-.][a-zA-Z0-9]+)*.[a-zA-Z]{2,7}$/;
  if (email.match(regEx)) return true;
  else return false;
};

//Validate SignUp
exports.validateSignupData = (data) => {
  let errors = {};

  if (isEmpty(data.email)) errors.email = "Email must not be empty";
  else if (!isEmail(data.email)) errors.email = "Email must be a valid adress";

  if (isEmpty(data.handle)) errors.handle = "Handle must not be empty";

  if (isEmpty(data.password)) errors.password = "Password must not be empty";

  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Password must be match";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

//Validate Login
exports.validateLoginData = (data) => {
  let errors = {};

  if (isEmpty(data.email)) errors.email = "Email must not be empty";
  if (isEmpty(data.password)) errors.password = "Password must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

//Validata Scream
exports.validateCreateScreamData = (data) => {
  let errors = {};

  if (data.trim() === "") errors.body = "Body must not be empty";
  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

//Validate User Details
exports.reduceUserDetails = (data) => {
  let userDetails = {};

  if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if (!isEmpty(data.website.trim())) {
    //https://user.com
    if (data.website.trim().substring(0, 4) !== "http")
      userDetails.website = `http://${data.website.trim()}`;
    else userDetails.website = data.website;
  }
  if(!isEmpty(data.location.trim())) userDetails.location = data.location;

  return userDetails;
};
