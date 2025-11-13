import React, { useState } from 'react';

interface TicketOption {
  value: number;
  label: string;
  prize: number;
}

interface TicketCarouselProps {
  options: TicketOption[];
  selectedValue: number;
  onValueChange: (value: number) => void;
  userBalance: number;
  disabled?: boolean;
}

export const TicketCarousel: React.FC<TicketCarouselProps> = ({
  options,
  selectedValue,
  onValueChange,
  userBalance,
  disabled = false
}) => {
  const selectedIndex = options.findIndex(option => option.value === selectedValue);
  const [currentIndex, setCurrentIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
    setCurrentIndex(newIndex);
    onValueChange(options[newIndex].value);
  };

  const handleNext = () => {
    const newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onValueChange(options[newIndex].value);
  };

  const currentOption = options[currentIndex];
  const canAfford = userBalance >= currentOption.value;

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="ticket-carousel">
      <div className="ticket-carousel-container">
        <button
          className="carousel-arrow carousel-arrow-left"
          onClick={handlePrevious}
          disabled={disabled}
          aria-label="Ticket anterior"
        >
          ←
        </button>

        <div className={`ticket-option ${!canAfford ? 'insufficient-balance' : ''} ${disabled ? 'disabled' : ''}`}>
          <div className="ticket-value">
            {formatCurrency(currentOption.value)}
          </div>
          <div className="ticket-label">{currentOption.label}</div>
          <div className="ticket-prize">
            Prêmio: {formatCurrency(currentOption.prize)}
          </div>
          {!canAfford && (
            <div className="insufficient-balance-warning">
              Saldo insuficiente
            </div>
          )}
        </div>

        <button
          className="carousel-arrow carousel-arrow-right"
          onClick={handleNext}
          disabled={disabled}
          aria-label="Próximo ticket"
        >
          →
        </button>
      </div>

      <div className="ticket-carousel-indicators">
        {options.map((_, index) => (
          <button
            key={index}
            className={`indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => {
              if (!disabled) {
                setCurrentIndex(index);
                onValueChange(options[index].value);
              }
            }}
            disabled={disabled}
            aria-label={`Ticket ${formatCurrency(options[index].value)}`}
          />
        ))}
      </div>
    </div>
  );
};