const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const testing =  regEx.test(email);
    return testing
}
const isEmpty = (string) => {     
    if(string.trim() === ''){
       return true;
    } 
    else return false;  
}

exports.validateSignupData = (data) => {

    let errors = {};

    if(isEmpty(data.email)){
        errors.email = 'Field must not be empty'
    }else if(!isEmail(data.email)){
         errors.email = 'Field must contain a valid email'
    }
    if(isEmpty(data.password)) errors.password = 'Field must not be empty';
    if(data.password !== data.confirmPassword) errors.confirmPassword = 'passwords do not match';
    if(isEmpty(data.handle)) errors.handle = 'Field must not be empty'; 
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.validateLoginData = (data) => {
    let errors = {};
    if(isEmpty(data.email)) errors.email = 'Must not be empty';
    if(isEmpty(data.password)) errors.password = 'Must not be empty';
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}
