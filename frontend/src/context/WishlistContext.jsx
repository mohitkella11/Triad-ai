import { createContext, useState, useEffect } from 'react';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);

  useEffect(() => {
    const items = localStorage.getItem('wishlistItems');
    if (items) {
      setWishlistItems(JSON.parse(items));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('wishlistItems', JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  const toggleWishlist = (product) => {
    const existItem = wishlistItems.find((x) => x._id === product._id);
    if (existItem) {
      setWishlistItems(wishlistItems.filter((x) => x._id !== product._id));
    } else {
      setWishlistItems([...wishlistItems, product]);
    }
  };

  const isInWishlist = (id) => {
    return wishlistItems.some((x) => x._id === id);
  };

  return (
    <WishlistContext.Provider value={{ wishlistItems, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistContext;
