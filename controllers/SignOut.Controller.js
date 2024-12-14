const signOutController = async (req,res) => {
  try {
    res.clearCookie("token")

    res.json({
        message:"Sign Out Successfully",
        error:false,
        success:true,
    })
  } catch (err) {
    res.json({
      message: err.message || err,
      error: true,
      success: false,
    });
  }
};

export default signOutController
