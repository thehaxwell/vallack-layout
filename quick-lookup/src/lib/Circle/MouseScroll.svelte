<script>
  export const labels = [];
  export let isActive = false;
</script>

<div class="cardinal-levers-container" class:active={isActive}>
  <div class="flex">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9.172 16.818L7.757 18.232L12 22.475L16.243 18.232L14.828 16.818L12 19.647L9.172 16.818ZM14.828 7.18199L16.243 5.76799L12 1.52499L7.757 5.76799L9.172 7.18199L12 4.35399L14.828 7.18199Z" fill="black"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 9C12.7956 9 13.5587 9.31607 14.1213 9.87868C14.6839 10.4413 15 11.2044 15 12C15 12.7956 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7956 15 12 15C11.2044 15 10.4413 14.6839 9.87868 14.1213C9.31607 13.5587 9 12.7956 9 12C9 11.2044 9.31607 10.4413 9.87868 9.87868C10.4413 9.31607 11.2044 9 12 9ZM12 11C12.2652 11 12.5196 11.1054 12.7071 11.2929C12.8946 11.4804 13 11.7348 13 12C13 12.2652 12.8946 12.5196 12.7071 12.7071C12.5196 12.8946 12.2652 13 12 13C11.7348 13 11.4804 12.8946 11.2929 12.7071C11.1054 12.5196 11 12.2652 11 12C11 11.7348 11.1054 11.4804 11.2929 11.2929C11.4804 11.1054 11.7348 11 12 11Z" fill="black"/>
    </svg>
    +
    <div class="ml-1 flex items-center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.182 9.17199L5.768 7.75699L1.525 12L5.768 16.243L7.182 14.828L4.353 12L7.182 9.17199ZM16.818 14.828L18.232 16.243L22.475 12L18.232 7.75699L16.818 9.17199L19.646 12L16.818 14.828Z" fill="black"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M15 12C15 12.7956 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7956 15 12 15C11.2044 15 10.4413 14.6839 9.87868 14.1213C9.31607 13.5587 9 12.7956 9 12C9 11.2044 9.31607 10.4413 9.87868 9.87868C10.4413 9.31607 11.2044 9 12 9C12.7956 9 13.5587 9.31607 14.1213 9.87868C14.6839 10.4413 15 11.2044 15 12ZM13 12C13 12.2652 12.8946 12.5196 12.7071 12.7071C12.5196 12.8946 12.2652 13 12 13C11.7348 13 11.4804 12.8946 11.2929 12.7071C11.1054 12.5196 11 12.2652 11 12C11 11.7348 11.1054 11.4804 11.2929 11.2929C11.4804 11.1054 11.7348 11 12 11C12.2652 11 12.5196 11.1054 12.7071 11.2929C12.8946 11.4804 13 11.7348 13 12Z" fill="black"/>
      </svg>
    </div>
  </div>
</div>

<style>
  .cardinal-levers-container {
    background-color: #d9d9d9;
    border-radius: 100%;
    height: 71px;
    width: 71px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 4px solid #d9d9d9;
  }
  .cardinal-levers-container.active {
    border: 4px solid var(--active-highlight-color);
  }

  .flex {
    display: flex;
  }
  .ml-1 {
    margin-left: .25rem;
  }
  .items-center{
    align-items: center;
  }
</style>
