<?php

namespace App\DTOs;

abstract readonly class BaseDTO
{
    abstract public function toArray(): array;

    public static function fromArray(array $data): static
    {
        return new static(...$data);
    }
}
