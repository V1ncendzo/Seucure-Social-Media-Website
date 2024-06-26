import User from "../models/User.js";
import bcrypt from "bcrypt";

/* READ */
export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    res.status(200).json(user);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

export const getUserFriends = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    const friends = await Promise.all(
      user.friends.map((id) => User.findById(id))
    );
    const formattedFriends = friends.map(
      ({ _id, firstName, lastName, occupation, location, picturePath }) => {
        return { _id, firstName, lastName, occupation, location, picturePath };
      }
    );
    res.status(200).json(formattedFriends);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

/* UPDATE */
export const addRemoveFriend = async (req, res) => {
  try {
    const { id, friendId } = req.params;
    const userIdFromRequest = req.user.id; // Assuming you have the user ID in the request object

    // Check if the user is trying to add themselves as a friend
    if (id === friendId) {
      // Redirect to home page
      return res.redirect("/home");
    }

    const user = await User.findById(id);
    const friend = await User.findById(friendId);

    if (!user || !friend) {
      return res.status(404).json({ message: "User or friend not found." });
    }
    
    if (!Array.isArray(user.friends) || !Array.isArray(friend.friends)) {
      return res.status(500).json({ message: "Invalid friends data." });
    }

    if (user.friends.includes(friendId)) {
      user.friends = user.friends.filter((id) => id !== friendId);
      friend.friends = friend.friends.filter((id) => id !== id);
    } else {
      user.friends.push(friendId);
      friend.friends.push(id);
    }
    await user.save();
    await friend.save();

    const friends = await Promise.all(
      user.friends.map((id) => User.findById(id))
    );
    const formattedFriends = friends.map(
      ({ _id, firstName, lastName, occupation, location, picturePath }) => {
        return { _id, firstName, lastName, occupation, location, picturePath };
      }
    );

    res.status(200).json(formattedFriends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* CHANGE PASSWORD */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ msg: "Please enter both old and new passwords." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found." });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid current password." });

    // Password complexity validation
    const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordComplexityRegex.test(newPassword)) {
      return res.status(400).json({ 
        msg: "Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character." 
      });
    }

    const salt = await bcrypt.genSalt();
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    if (!newPasswordHash) {
      return res.status(500).json({ msg: "Error hashing new password." }); // Handle hashing error
    }
    
    user.password = newPasswordHash;
    await user.save();

    res.status(200).json({ msg: "Password successfully changed." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};