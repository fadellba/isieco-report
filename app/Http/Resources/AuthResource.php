<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class AuthResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'user' => [
                'id' => $this->resource['user']->id,
                'nom' => $this->resource['user']->nom,
                'prenom' => $this->resource['user']->prenom,
                'name' => $this->resource['user']->name,
                'email' => $this->resource['user']->email,
            ],

            'token' => $this->resource['token'],
        ];
    }
}
