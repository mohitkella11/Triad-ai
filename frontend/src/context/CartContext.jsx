import { createContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [giftDetails, setGiftDetails] = useState(
    localStorage.getItem('giftDetails') ? JSON.parse(localStorage.getItem('giftDetails')) : {}
  );

  useEffect(() => {
    const items = localStorage.getItem('cartItems');
    if (items) {
      setCartItems(JSON.parse(items));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const saveGiftDetails = (data) => {
    setGiftDetails(data);
    localStorage.setItem('giftDetails', JSON.stringify(data));
  };

  const addToCart = (product, qty, giftOptions = null) => {
    const existItem = cartItems.find((x) => x.product === product._id);

    if (existItem) {
      setCartItems(
        cartItems.map((x) =>
          x.product === existItem.product ? { ...product, qty, product: product._id, giftOptions: giftOptions || x.giftOptions } : x
        )
      );
    } else {
      setCartItems([...cartItems, { ...product, qty, product: product._id, giftOptions }]);
    }
  };

  const removeFromCart = (id) => {
    setCartItems(cartItems.filter((x) => x.product !== id));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <CartContext.Provider value={{ cartItems, giftDetails, addToCart, removeFromCart, clearCart, saveGiftDetails }}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
