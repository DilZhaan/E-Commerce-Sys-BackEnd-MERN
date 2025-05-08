exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = user.generateAuthToken();

    console.log("User Data Sent to Frontend:", {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    }); // Debug log

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, // Ensure role is included
      },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error.message); // Debug log
    res.status(500).json({ message: "Server error" });
  }
};
