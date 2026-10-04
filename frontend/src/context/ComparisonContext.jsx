import React, { createContext, useContext, useState, useEffect } from 'react';

const ComparisonContext = createContext();

export const useComparison = () => useContext(ComparisonContext);

export const ComparisonProvider = ({ children }) => {
  const [compareList, setCompareList] = useState(() => {
    const saved = sessionStorage.getItem('smartchoice_compare');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    sessionStorage.setItem('smartchoice_compare', JSON.stringify(compareList));
  }, [compareList]);

  const addProduct = (product) => {
    if (compareList.length >= 5) {
      alert('You can compare up to 5 products at a time.');
      return false;
    }
    if (!compareList.find(p => p._id === product._id)) {
      setCompareList([...compareList, product]);
      return true;
    }
    return false;
  };

  const removeProduct = (productId) => {
    setCompareList(compareList.filter(p => p._id !== productId));
  };

  const clearProducts = () => {
    setCompareList([]);
  };

  const hasProduct = (productId) => {
    return !!compareList.find(p => p._id === productId);
  };

  const getProductCount = () => {
    return compareList.length;
  };

  return (
    <ComparisonContext.Provider value={{
      compareList,
      addProduct,
      removeProduct,
      clearProducts,
      hasProduct,
      getProductCount
    }}>
      {children}
    </ComparisonContext.Provider>
  );
};
