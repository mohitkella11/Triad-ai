import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingCart } from 'lucide-react';
import styles from './ProductCard.module.css';
import WishlistContext from '../context/WishlistContext';
import CartContext from '../context/CartContext';

const ProductCard = ({ product }) => {
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext);
  const { addToCart } = useContext(CartContext);

  const inWishlist = isInWishlist(product._id);

  const handleWishlist = (e) => {
    e.preventDefault();
    toggleWishlist(product);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product, 1);
  };

  return (
    <Link to={`/product/${product._id}`} className={styles.card}>
      <div className={styles.imageContainer}>
        <img src={product.image} alt={product.name} className={styles.image} />
        <button 
          className={`${styles.wishlistBtn} ${inWishlist ? styles.active : ''}`}
          onClick={handleWishlist}
        >
          <Heart size={20} />
        </button>
      </div>
      
      <div className={styles.content}>
        <div className={styles.category}>{product.category}</div>
        <h3 className={styles.title}>{product.name}</h3>
        
        <div className={styles.priceRow}>
          <div className={styles.price}>₹{product.price}</div>
          <div className={styles.rating}>
            <Star size={16} className={styles.starIcon} />
            {product.rating} ({product.numReviews})
          </div>
        </div>
      </div>

      <div className={styles.addToCartOverlay}>
        <button className={`btn btn-primary ${styles.addToCartBtn}`} onClick={handleAddToCart}>
          <ShoppingCart size={18} /> Add to Cart
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;
