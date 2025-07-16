'use client'

import { forwardRef, useId, useState, useRef, useEffect, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react'
import { useAccessibility, useScreenReaderAnnouncements } from '../../hooks/use-accessibility'
import { OptimizedIcon } from './optimized-icons'
import { cn } from '@/lib/utils'

// Composant Button accessible
interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
  loadingText?: string
  icon?: string
  iconPosition?: 'left' | 'right'
  ariaLabel?: string
  ariaDescribedBy?: string
  announceOnClick?: string
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'default', 
    loading = false,
    loadingText = 'Chargement...',
    icon,
    iconPosition = 'left',
    ariaLabel,
    ariaDescribedBy,
    announceOnClick,
    children,
    onClick,
    disabled,
    ...props 
  }, ref) => {
    const { announce } = useScreenReaderAnnouncements()
    const { isHighContrast, isLargeText } = useAccessibility()
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (announceOnClick) {
        announce(announceOnClick)
      }
      onClick?.(e)
    }

    const baseClasses = cn(
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      isHighContrast && 'border-2 border-current',
      isLargeText && 'text-base px-6 py-3',
      className
    )

    const variantClasses = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline'
    }

    const sizeClasses = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10'
    }

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size])}
        disabled={disabled || loading}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        onClick={handleClick}
        {...props}
      >
        {loading && (
          <OptimizedIcon 
            name="Loader" 
            critical 
            size={16} 
            className="mr-2 animate-spin" 
            aria-hidden="true"
          />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <OptimizedIcon 
            name={icon} 
            size={16} 
            className="mr-2" 
            aria-hidden="true"
          />
        )}
        {loading ? loadingText : children}
        {!loading && icon && iconPosition === 'right' && (
          <OptimizedIcon 
            name={icon} 
            size={16} 
            className="ml-2" 
            aria-hidden="true"
          />
        )}
      </button>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'

// Composant Input accessible
interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  icon?: string
  iconPosition?: 'left' | 'right'
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ 
    className, 
    label, 
    error, 
    hint, 
    required, 
    icon,
    iconPosition = 'left',
    id,
    ...props 
  }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    const hintId = `${inputId}-hint`
    const { isHighContrast, isLargeText } = useAccessibility()

    const inputClasses = cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
      'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      error && 'border-destructive focus-visible:ring-destructive',
      isHighContrast && 'border-2',
      isLargeText && 'text-base h-12 px-4 py-3',
      icon && iconPosition === 'left' && 'pl-10',
      icon && iconPosition === 'right' && 'pr-10',
      className
    )

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              isLargeText && 'text-base',
              error && 'text-destructive'
            )}
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-label="requis">*</span>
            )}
          </label>
        )}
        
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <OptimizedIcon 
              name={icon} 
              size={16} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
              aria-hidden="true"
            />
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              error && errorId,
              hint && hintId
            )}
            aria-required={required}
            {...props}
          />
          
          {icon && iconPosition === 'right' && (
            <OptimizedIcon 
              name={icon} 
              size={16} 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
              aria-hidden="true"
            />
          )}
        </div>
        
        {hint && !error && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
        
        {error && (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            <OptimizedIcon name="AlertCircle" critical size={16} className="inline mr-1" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    )
  }
)

AccessibleInput.displayName = 'AccessibleInput'

// Composant Modal accessible avec focus trap
interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true
}: AccessibleModalProps) {
  const { createFocusTrap, exitFocusTrap } = useAccessibility()
  const { announce } = useScreenReaderAnnouncements()
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (isOpen && modalRef.current) {
      announce(`Modal ouvert: ${title}`)
      const trap = createFocusTrap(modalRef.current)
      
      return () => {
        trap.destroy()
        announce('Modal fermé')
      }
    }
  }, [isOpen, title, createFocusTrap, announce])

  useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={cn(
          'relative bg-background rounded-lg shadow-lg border p-6 m-4 w-full',
          sizeClasses[size]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <AccessibleButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            ariaLabel="Fermer la modal"
            icon="X"
          />
        </div>
        
        {/* Description */}
        {description && (
          <p id={descriptionId} className="text-muted-foreground mb-4">
            {description}
          </p>
        )}
        
        {/* Content */}
        <div>
          {children}
        </div>
      </div>
    </div>
  )
}

// Composant de navigation accessible
interface AccessibleNavProps {
  items: Array<{
    href: string
    label: string
    icon?: string
    current?: boolean
    disabled?: boolean
  }>
  orientation?: 'horizontal' | 'vertical'
  ariaLabel?: string
}

export function AccessibleNav({ 
  items, 
  orientation = 'horizontal', 
  ariaLabel = 'Navigation principale' 
}: AccessibleNavProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { announce } = useScreenReaderAnnouncements()

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = index

    switch (e.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal') {
          e.preventDefault()
          newIndex = (index + 1) % items.length
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          e.preventDefault()
          newIndex = index === 0 ? items.length - 1 : index - 1
        }
        break
      case 'ArrowDown':
        if (orientation === 'vertical') {
          e.preventDefault()
          newIndex = (index + 1) % items.length
        }
        break
      case 'ArrowUp':
        if (orientation === 'vertical') {
          e.preventDefault()
          newIndex = index === 0 ? items.length - 1 : index - 1
        }
        break
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
      case 'End':
        e.preventDefault()
        newIndex = items.length - 1
        break
    }

    if (newIndex !== index) {
      setCurrentIndex(newIndex)
      const newItem = items[newIndex]
      announce(`Navigation vers ${newItem.label}`)
      
      // Focus sur le nouvel élément
      const navElement = document.querySelector(`[data-nav-index="${newIndex}"]`) as HTMLElement
      navElement?.focus()
    }
  }

  return (
    <nav 
      role="navigation" 
      aria-label={ariaLabel}
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row space-x-1' : 'flex-col space-y-1'
      )}
    >
      {items.map((item, index) => (
        <a
          key={item.href}
          href={item.href}
          data-nav-index={index}
          className={cn(
            'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            item.current 
              ? 'bg-primary text-primary-foreground' 
              : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            item.disabled && 'opacity-50 pointer-events-none'
          )}
          aria-current={item.current ? 'page' : undefined}
          aria-disabled={item.disabled}
          tabIndex={index === currentIndex ? 0 : -1}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onFocus={() => setCurrentIndex(index)}
        >
          {item.icon && (
            <OptimizedIcon 
              name={item.icon} 
              size={16} 
              className="mr-2" 
              aria-hidden="true"
            />
          )}
          {item.label}
        </a>
      ))}
    </nav>
  )
}

// Composant de région live pour les annonces
export function LiveRegion() {
  const { announcements } = useAccessibility()

  return (
    <div className="sr-only">
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          aria-live={announcement.priority}
          aria-atomic="true"
        >
          {announcement.message}
        </div>
      ))}
    </div>
  )
}
