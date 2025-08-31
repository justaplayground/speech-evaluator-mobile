import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded-2xl font-semibold items-center justify-center';
  
  const variantClasses = {
    primary: 'bg-blue-500',
    secondary: 'bg-gray-500',
    outline: 'bg-transparent border-2 border-blue-500',
  };
  
  const sizeClasses = {
    small: 'px-4 py-2',
    medium: 'px-6 py-3',
    large: 'px-8 py-4',
  };
  
  const textClasses = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-blue-500',
  };

  return (
    <TouchableOpacity
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      <Text className={`text-center font-semibold ${textClasses[variant]}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};